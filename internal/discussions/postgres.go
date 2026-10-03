package discussions

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresStore struct{ db *pgxpool.Pool }

func NewPostgresStore(db *pgxpool.Pool) *PostgresStore { return &PostgresStore{db: db} }
func (s *PostgresStore) Create(ctx context.Context, d Discussion) error {
	_, err := s.db.Exec(ctx, `INSERT INTO discussions (id, author_id, topic, body, type, created_at) VALUES ($1,$2,$3,$4,$5,$6)`, d.ID, d.AuthorID, d.Topic, d.Body, d.Type, d.CreatedAt)
	return err
}
func (s *PostgresStore) List(ctx context.Context, limit int) ([]Discussion, error) {
	rows, err := s.db.Query(ctx, `SELECT id, author_id, topic, body, type, created_at FROM discussions ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Discussion, 0, limit)
	for rows.Next() {
		var d Discussion
		if err := rows.Scan(&d.ID, &d.AuthorID, &d.Topic, &d.Body, &d.Type, &d.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, d)
	}
	return items, rows.Err()
}
