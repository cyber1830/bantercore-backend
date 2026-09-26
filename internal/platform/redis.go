package platform

import (
	"context"
	"encoding/json"
	"github.com/redis/go-redis/v9"
	"github.com/sahilverma/muze-go-backend/internal/discussions"
	"time"
)

type RedisCache struct{ client *redis.Client }

func NewRedisCache(client *redis.Client) *RedisCache { return &RedisCache{client: client} }
func (c *RedisCache) Get(ctx context.Context, key string) ([]discussions.Discussion, bool) {
	raw, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		return nil, false
	}
	var rows []discussions.Discussion
	if json.Unmarshal(raw, &rows) != nil {
		return nil, false
	}
	return rows, true
}
func (c *RedisCache) Set(ctx context.Context, key string, rows []discussions.Discussion, ttl time.Duration) {
	raw, err := json.Marshal(rows)
	if err == nil {
		_ = c.client.Set(ctx, key, raw, ttl).Err()
	}
}
