package main

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/sahilverma/muze-go-backend/internal/auth"
	"github.com/sahilverma/muze-go-backend/internal/discussions"
	"github.com/sahilverma/muze-go-backend/internal/platform"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	var store discussions.Store = discussions.NewMemoryStore()
	var pool *pgxpool.Pool
	if dsn := os.Getenv("DATABASE_URL"); dsn != "" {
		var err error
		pool, err = pgxpool.New(context.Background(), dsn)
		if err != nil {
			logger.Error("database_connect_failed", "error", err)
			os.Exit(1)
		}
		if err = pool.Ping(context.Background()); err != nil {
			logger.Error("database_ping_failed", "error", err)
			os.Exit(1)
		}
		store = discussions.NewPostgresStore(pool)
		defer pool.Close()
	}
	var cache discussions.Cache = platform.NewNoopCache()
	if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
		options, err := redis.ParseURL(redisURL)
		if err != nil {
			logger.Error("redis_url_invalid", "error", err)
			os.Exit(1)
		}
		client := redis.NewClient(options)
		if err = client.Ping(context.Background()).Err(); err != nil {
			logger.Error("redis_ping_failed", "error", err)
			os.Exit(1)
		}
		cache = platform.NewRedisCache(client)
		defer client.Close()
	}
	service := discussions.NewService(store, cache, platform.NewLogPublisher(logger))
	handler := discussions.NewHandler(service, auth.NewTokenManager("development-secret-change-me", time.Hour), auth.NewUserService())
	web := http.FileServer(http.Dir("./web"))
	mux := http.NewServeMux()
	mux.Handle("/api/", handler)
	mux.Handle("/web/", http.StripPrefix("/web/", web))
	mux.Handle("/", http.RedirectHandler("/web/", http.StatusFound))
	server := &http.Server{Addr: ":8080", Handler: platform.RequestID(platform.Logging(logger, mux)), ReadHeaderTimeout: 5 * time.Second}
	go func() {
		logger.Info("api_started", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("api_failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
