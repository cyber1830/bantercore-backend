package discussions

import (
	"context"
	"testing"
	"time"
)

type testCache struct{}

func (testCache) Get(context.Context, string) ([]Discussion, bool)         { return nil, false }
func (testCache) Set(context.Context, string, []Discussion, time.Duration) {}

type testPublisher struct{}

func (testPublisher) Publish(context.Context, string, any) error { return nil }
func TestCreateValidatesAndPersists(t *testing.T) {
	s := NewService(NewMemoryStore(), testCache{}, testPublisher{})
	if _, err := s.Create(context.Background(), "u1", "go", "building fast APIs"); err != nil {
		t.Fatal(err)
	}
	rows, _ := s.List(context.Background(), 10)
	if len(rows) != 1 || rows[0].Topic != "go" {
		t.Fatalf("unexpected rows: %#v", rows)
	}
}
func TestCreateRejectsEmptyBody(t *testing.T) {
	s := NewService(NewMemoryStore(), testCache{}, testPublisher{})
	if _, err := s.Create(context.Background(), "u1", "go", ""); err == nil {
		t.Fatal("expected validation error")
	}
}
