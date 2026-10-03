package auth

import (
	"errors"
	"github.com/golang-jwt/jwt/v5"
	"time"
)

type TokenManager struct {
	secret []byte
	ttl    time.Duration
}

func NewTokenManager(secret string, ttl time.Duration) *TokenManager {
	return &TokenManager{[]byte(secret), ttl}
}
func (m *TokenManager) Issue(userID string) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": userID, "exp": time.Now().Add(m.ttl).Unix()}).SignedString(m.secret)
}
func (m *TokenManager) Verify(token string) (string, error) {
	parsed, err := jwt.Parse(token, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	})
	if err != nil || !parsed.Valid {
		return "", errors.New("invalid token")
	}
	id, ok := parsed.Claims.(jwt.MapClaims)["sub"].(string)
	if !ok || id == "" {
		return "", errors.New("missing subject")
	}
	return id, nil
}
