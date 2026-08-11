package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"kartfinance-api/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	CurrentAdminLocal   = "currentAdmin"
	CurrentSessionLocal = "currentSession"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type Config struct {
	CookieName string
	Secure     bool
	SameSite   string
	TTL        time.Duration
}

func ConfigFromEnv() Config {
	secure, _ := strconv.ParseBool(os.Getenv("SESSION_COOKIE_SECURE"))
	sameSite := strings.TrimSpace(os.Getenv("SESSION_COOKIE_SAME_SITE"))
	if sameSite == "" {
		sameSite = "Lax"
	}
	return Config{
		CookieName: "kart_session",
		Secure:     secure,
		SameSite:   sameSite,
		TTL:        12 * time.Hour,
	}
}

type Manager struct {
	database *gorm.DB
	config   Config
	now      func() time.Time
}

func NewManager(database *gorm.DB, config Config) *Manager {
	return &Manager{database: database, config: config, now: time.Now}
}

func (m *Manager) Authenticate(email, password string) (*models.Admin, string, string, error) {
	var admin models.Admin
	if err := m.database.Where("LOWER(email) = LOWER(?)", strings.TrimSpace(email)).First(&admin).Error; err != nil {
		return nil, "", "", ErrInvalidCredentials
	}

	valid, legacy := verifyPassword(admin.Password, password)
	if !valid {
		return nil, "", "", ErrInvalidCredentials
	}
	if legacy {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return nil, "", "", fmt.Errorf("hash legacy password: %w", err)
		}
		if err := m.database.Model(&models.Admin{}).Where("id = ?", admin.ID).Update("password", string(hash)).Error; err != nil {
			return nil, "", "", fmt.Errorf("migrate legacy password: %w", err)
		}
	}

	token, err := randomToken()
	if err != nil {
		return nil, "", "", err
	}
	csrfToken, err := randomToken()
	if err != nil {
		return nil, "", "", err
	}
	now := m.now().UTC()
	session := models.AdminSession{
		ID:         uuid.NewString(),
		AdminID:    admin.ID,
		TokenHash:  hashToken(token),
		CSRFToken:  csrfToken,
		ExpiresAt:  now.Add(m.config.TTL),
		CreatedAt:  now,
		LastSeenAt: now,
	}
	if err := m.database.Create(&session).Error; err != nil {
		return nil, "", "", fmt.Errorf("create session: %w", err)
	}

	return &admin, token, csrfToken, nil
}

func (m *Manager) SetCookie(c *fiber.Ctx, token string) {
	c.Cookie(&fiber.Cookie{
		Name:     m.config.CookieName,
		Value:    token,
		Path:     "/",
		HTTPOnly: true,
		Secure:   m.config.Secure,
		SameSite: m.config.SameSite,
		Expires:  m.now().Add(m.config.TTL),
	})
}

func (m *Manager) ClearCookie(c *fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     m.config.CookieName,
		Value:    "",
		Path:     "/",
		HTTPOnly: true,
		Secure:   m.config.Secure,
		SameSite: m.config.SameSite,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})
}

func (m *Manager) RequireSession(c *fiber.Ctx) error {
	token := c.Cookies(m.config.CookieName)
	if token == "" {
		return unauthorized(c)
	}

	var session models.AdminSession
	err := m.database.Preload("Admin").
		Where("token_hash = ? AND expires_at > ?", hashToken(token), m.now().UTC()).
		First(&session).Error
	if err != nil {
		m.ClearCookie(c)
		return unauthorized(c)
	}

	if requiresCSRF(c.Method()) {
		provided := c.Get("X-CSRF-Token")
		if provided == "" || subtle.ConstantTimeCompare([]byte(provided), []byte(session.CSRFToken)) != 1 {
			return c.Status(fiber.StatusForbidden).Type("application/problem+json").JSON(fiber.Map{
				"type": "https://kartfinance.local/problems/csrf", "title": "CSRF token inválido", "status": 403,
			})
		}
	}

	c.Locals(CurrentAdminLocal, &session.Admin)
	c.Locals(CurrentSessionLocal, &session)
	return c.Next()
}

func (m *Manager) Logout(c *fiber.Ctx) error {
	token := c.Cookies(m.config.CookieName)
	if token != "" {
		if err := m.database.Where("token_hash = ?", hashToken(token)).Delete(&models.AdminSession{}).Error; err != nil {
			return err
		}
	}
	m.ClearCookie(c)
	return nil
}

func (m *Manager) CleanupExpired() error {
	return m.database.Where("expires_at <= ?", m.now().UTC()).Delete(&models.AdminSession{}).Error
}

func CurrentAdmin(c *fiber.Ctx) (*models.Admin, bool) {
	admin, ok := c.Locals(CurrentAdminLocal).(*models.Admin)
	return admin, ok
}

func CurrentSession(c *fiber.Ctx) (*models.AdminSession, bool) {
	session, ok := c.Locals(CurrentSessionLocal).(*models.AdminSession)
	return session, ok
}

func RequireRole(roles ...string) fiber.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}
	return func(c *fiber.Ctx) error {
		admin, ok := CurrentAdmin(c)
		if !ok {
			return unauthorized(c)
		}
		if _, ok := allowed[admin.Role]; !ok {
			return c.Status(fiber.StatusForbidden).Type("application/problem+json").JSON(fiber.Map{
				"type": "https://kartfinance.local/problems/forbidden", "title": "Acesso negado", "status": 403,
			})
		}
		return c.Next()
	}
}

func HashPassword(password string) (string, error) {
	if len(password) < 8 {
		return "", fmt.Errorf("password must have at least 8 characters")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}

func VerifyPassword(stored, provided string) bool {
	valid, _ := verifyPassword(stored, provided)
	return valid
}

func verifyPassword(stored, provided string) (valid bool, legacy bool) {
	if strings.HasPrefix(stored, "$2a$") || strings.HasPrefix(stored, "$2b$") || strings.HasPrefix(stored, "$2y$") {
		return bcrypt.CompareHashAndPassword([]byte(stored), []byte(provided)) == nil, false
	}
	return subtle.ConstantTimeCompare([]byte(stored), []byte(provided)) == 1, true
}

func randomToken() (string, error) {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		return "", fmt.Errorf("generate secure token: %w", err)
	}
	return hex.EncodeToString(value), nil
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func requiresCSRF(method string) bool {
	return method != fiber.MethodGet && method != fiber.MethodHead && method != fiber.MethodOptions
}

func unauthorized(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUnauthorized).Type("application/problem+json").JSON(fiber.Map{
		"type": "https://kartfinance.local/problems/unauthorized", "title": "Autenticação necessária", "status": 401,
	})
}
