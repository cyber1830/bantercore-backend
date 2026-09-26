package platform

import (
	"context"
	"github.com/sahilverma/muze-go-backend/internal/discussions"
	"log/slog"
	"sync"
	"time"
)

type NoopCache struct {
	mu   sync.RWMutex
	data map[string][]discussions.Discussion
}

func NewNoopCache() *NoopCache { return &NoopCache{data: map[string][]discussions.Discussion{}} }
func (c *NoopCache) Get(_ context.Context, k string) ([]discussions.Discussion, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	v, ok := c.data[k]
	return v, ok
}
func (c *NoopCache) Set(_ context.Context, k string, v []discussions.Discussion, _ time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[k] = v
}

type LogPublisher struct{ l *slog.Logger }

func NewLogPublisher(l *slog.Logger) *LogPublisher { return &LogPublisher{l} }
func (p *LogPublisher) Publish(_ context.Context, t string, v any) error {
	p.l.Info("event_published", "type", t, "payload", v)
	return nil
}
