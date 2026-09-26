package discussions

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Discussion struct {
	ID        string    `json:"id"`
	AuthorID  string    `json:"authorId"`
	Topic     string    `json:"topic"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"createdAt"`
}

type Store interface {
	Create(context.Context, Discussion) error
	List(context.Context, int) ([]Discussion, error)
}

type Cache interface {
	Get(context.Context, string) ([]Discussion, bool)
	Set(context.Context, string, []Discussion, time.Duration)
}

type Publisher interface {
	Publish(context.Context, string, any) error
}

type Comment struct {
	ID           string    `json:"id"`
	DiscussionID string    `json:"discussionId"`
	AuthorID     string    `json:"authorId"`
	Body         string    `json:"body"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Service struct {
	store     Store
	cache     Cache
	publisher Publisher
	mu        sync.RWMutex
	comments  map[string][]Comment
	likes     map[string]map[string]bool
}

var (
	errDiscussionInput = errors.New("author, topic, and body are required")
	errCommentInput    = errors.New("discussion, author, and body are required")
)

func NewService(s Store, c Cache, p Publisher) *Service {
	return &Service{
		store:     s,
		cache:     c,
		publisher: p,
		comments:  map[string][]Comment{},
		likes:     map[string]map[string]bool{},
	}
}

func normalizeText(value string) string {
	return strings.TrimSpace(value)
}

func validateDiscussionInput(author, topic, body string) error {
	if author == "" || normalizeText(topic) == "" || normalizeText(body) == "" {
		return errDiscussionInput
	}
	return nil
}

func newDiscussion(author, topic, body string) Discussion {
	topic = normalizeText(topic)
	body = normalizeText(body)
	return Discussion{
		ID:        uuid.NewString(),
		AuthorID:  author,
		Topic:     topic,
		Body:      body,
		CreatedAt: time.Now().UTC(),
	}
}

func validateCommentInput(discussionID, authorID, body string) error {
	if discussionID == "" || authorID == "" || normalizeText(body) == "" {
		return errCommentInput
	}
	return nil
}

func newComment(discussionID, authorID, body string) Comment {
	return Comment{
		ID:           uuid.NewString(),
		DiscussionID: discussionID,
		AuthorID:     authorID,
		Body:         normalizeText(body),
		CreatedAt:    time.Now().UTC(),
	}
}

func (s *Service) Create(ctx context.Context, author, topic, body string) (Discussion, error) {
	if err := validateDiscussionInput(author, topic, body); err != nil {
		return Discussion{}, err
	}

	d := newDiscussion(author, topic, body)
	if err := s.store.Create(ctx, d); err != nil {
		return Discussion{}, err
	}
	_ = s.publisher.Publish(ctx, "discussion.created", d)
	return d, nil
}

func (s *Service) List(ctx context.Context, limit int) ([]Discussion, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return s.store.List(ctx, limit)
}

func (s *Service) AddComment(_ context.Context, discussionID, authorID, body string) (Comment, error) {
	if err := validateCommentInput(discussionID, authorID, body); err != nil {
		return Comment{}, err
	}

	c := newComment(discussionID, authorID, body)
	s.mu.Lock()
	s.comments[discussionID] = append(s.comments[discussionID], c)
	s.mu.Unlock()
	return c, nil
}

func (s *Service) Comments(_ context.Context, discussionID string) []Comment {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]Comment(nil), s.comments[discussionID]...)
}

func (s *Service) ToggleLike(_ context.Context, discussionID, userID string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.likes[discussionID] == nil {
		s.likes[discussionID] = map[string]bool{}
	}
	if s.likes[discussionID][userID] {
		delete(s.likes[discussionID], userID)
	} else {
		s.likes[discussionID][userID] = true
	}
	return len(s.likes[discussionID])
}

func (s *Service) LikeCount(_ context.Context, discussionID string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.likes[discussionID])
}
