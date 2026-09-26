package discussions

import "context"

type MemoryStore struct{ rows []Discussion }

func NewMemoryStore() *MemoryStore { return &MemoryStore{} }
func (m *MemoryStore) Create(_ context.Context, d Discussion) error {
	m.rows = append([]Discussion{d}, m.rows...)
	return nil
}
func (m *MemoryStore) List(_ context.Context, limit int) ([]Discussion, error) {
	if len(m.rows) < limit {
		limit = len(m.rows)
	}
	return m.rows[:limit], nil
}
