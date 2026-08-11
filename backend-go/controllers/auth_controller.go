package controllers

import (
	"errors"
	"kartfinance-api/internal/auth"
	"kartfinance-api/repository"

	"github.com/gofiber/fiber/v2"
)

type AuthController struct {
	Repo     *repository.AppRepository
	Sessions *auth.Manager
}

func NewAuthController(repo *repository.AppRepository, sessions *auth.Manager) *AuthController {
	return &AuthController{Repo: repo, Sessions: sessions}
}

func (ac *AuthController) Login(c *fiber.Ctx) error {
	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&credentials); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Formato de dados inválido",
		})
	}

	admin, token, csrfToken, err := ac.Sessions.Authenticate(credentials.Email, credentials.Password)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Credenciais inválidas",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Não foi possível criar a sessão",
		})
	}

	ac.Sessions.SetCookie(c, token)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success":   true,
		"id":        admin.ID,
		"name":      admin.Name,
		"email":     admin.Email,
		"pixKey":    admin.PixKey,
		"role":      admin.Role,
		"csrfToken": csrfToken,
	})
}
