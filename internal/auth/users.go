package auth

import (
	"errors"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"strings"
	"sync"
)

type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}
type UserService struct {
	mu    sync.RWMutex
	users map[string]struct {
		user User
		hash []byte
	}
}

func NewUserService() *UserService {
	return &UserService{users: map[string]struct {
		user User
		hash []byte
	}{}}
}
func (s *UserService) Register(username, email, password string) (User, error) {
	username, email, password = strings.TrimSpace(username), strings.TrimSpace(email), strings.TrimSpace(password)
	if len(username) < 3 || len(password) < 8 || !strings.Contains(email, "@") {
		return User{}, errors.New("username, valid email, and 8-character password are required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.users[strings.ToLower(username)]; ok {
		return User{}, errors.New("username already exists")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}
	u := User{ID: uuid.NewString(), Username: username, Email: email}
	s.users[strings.ToLower(username)] = struct {
		user User
		hash []byte
	}{u, hash}
	return u, nil
}
func (s *UserService) Login(username, password string) (User, error) {
	s.mu.RLock()
	entry, ok := s.users[strings.ToLower(strings.TrimSpace(username))]
	s.mu.RUnlock()
	if !ok || bcrypt.CompareHashAndPassword(entry.hash, []byte(password)) != nil {
		return User{}, errors.New("invalid credentials")
	}
	return entry.user, nil
}
