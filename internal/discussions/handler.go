package discussions

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/sahilverma/muze-go-backend/internal/auth"
)

type Handler struct {
	service *Service
	tokens  *auth.TokenManager
	users   *auth.UserService
}

func NewHandler(s *Service, t *auth.TokenManager, u *auth.UserService) *Handler {
	return &Handler{service: s, tokens: t, users: u}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	switch {
	case r.Method == http.MethodPost && r.URL.Path == "/api/v1/auth/register":
		h.register(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/api/v1/auth/login":
		h.login(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/health":
		h.writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	case r.Method == http.MethodGet && r.URL.Path == "/api/v1/discussions":
		h.list(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/api/v1/discussions":
		h.create(w, r)
	case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/comments"):
		h.comment(w, r)
	case r.Method == http.MethodGet && strings.Contains(r.URL.Path, "/comments"):
		h.comments(w, r)
	case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/like"):
		h.like(w, r)
	default:
		http.NotFound(w, r)
	}
}

func (h *Handler) writeJSON(w http.ResponseWriter, status int, payload any) {
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
	}
}

func (h *Handler) writeJSONError(w http.ResponseWriter, status int, message string) {
	h.writeJSON(w, status, map[string]string{"error": message})
}

func (h *Handler) decodeJSON(r *http.Request, payload any) error {
	return json.NewDecoder(r.Body).Decode(payload)
}

func (h *Handler) parseDiscussionID(path string) string {
	return strings.TrimSuffix(strings.TrimPrefix(path, "/api/v1/discussions/"), "/comments")
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := h.decodeJSON(r, &in); err != nil {
		h.writeJSONError(w, http.StatusBadRequest, "invalid json")
		return
	}

	u, err := h.users.Register(in.Username, in.Email, in.Password)
	if err != nil {
		h.writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	token, _ := h.tokens.Issue(u.ID)
	h.writeJSON(w, http.StatusCreated, map[string]any{"user": u, "token": token})
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := h.decodeJSON(r, &in); err != nil {
		h.writeJSONError(w, http.StatusBadRequest, "invalid json")
		return
	}

	u, err := h.users.Login(in.Username, in.Password)
	if err != nil {
		h.writeJSONError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, _ := h.tokens.Issue(u.ID)
	h.writeJSON(w, http.StatusOK, map[string]any{"user": u, "token": token})
}

func (h *Handler) user(r *http.Request) (string, bool) {
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	id, err := h.tokens.Verify(token)
	return id, err == nil
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	rows, err := h.service.List(r.Context(), limit)
	if err != nil {
		h.writeJSONError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if rows == nil {
		rows = []Discussion{}
	}
	h.writeJSON(w, http.StatusOK, rows)
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	user, ok := h.user(r)
	if !ok {
		h.writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var in struct {
		Topic string `json:"topic"`
		Body  string `json:"body"`
	}
	if err := h.decodeJSON(r, &in); err != nil {
		h.writeJSONError(w, http.StatusBadRequest, "invalid json")
		return
	}

	d, err := h.service.Create(r.Context(), user, in.Topic, in.Body)
	if err != nil {
		h.writeJSONError(w, http.StatusBadRequest, "validation error")
		return
	}
	h.writeJSON(w, http.StatusCreated, d)
}

func (h *Handler) comment(w http.ResponseWriter, r *http.Request) {
	user, ok := h.user(r)
	if !ok {
		h.writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := h.parseDiscussionID(r.URL.Path)
	var in struct {
		Body string `json:"body"`
	}
	if err := h.decodeJSON(r, &in); err != nil {
		h.writeJSONError(w, http.StatusBadRequest, "invalid json")
		return
	}

	c, err := h.service.AddComment(r.Context(), id, user, in.Body)
	if err != nil {
		h.writeJSONError(w, http.StatusBadRequest, "validation error")
		return
	}
	h.writeJSON(w, http.StatusCreated, c)
}

func (h *Handler) comments(w http.ResponseWriter, r *http.Request) {
	id := h.parseDiscussionID(r.URL.Path)
	h.writeJSON(w, http.StatusOK, h.service.Comments(r.Context(), id))
}

func (h *Handler) like(w http.ResponseWriter, r *http.Request) {
	user, ok := h.user(r)
	if !ok {
		h.writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/v1/discussions/"), "/like")
	h.writeJSON(w, http.StatusOK, map[string]int{"likes": h.service.ToggleLike(r.Context(), id, user)})
}
