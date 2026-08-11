package controllers

import (
	"kartfinance-api/internal/auth"
	"kartfinance-api/internal/httpx"

	"github.com/gofiber/fiber/v2"
)

type SessionController struct {
	Sessions *auth.Manager
}

func NewSessionController(sessions *auth.Manager) *SessionController {
	return &SessionController{Sessions: sessions}
}

func (sc *SessionController) Me(c *fiber.Ctx) error {
	admin, ok := auth.CurrentAdmin(c)
	if !ok {
		return httpx.WriteProblem(c, fiber.StatusUnauthorized, "unauthorized", "Autenticação necessária", "")
	}
	session, ok := auth.CurrentSession(c)
	if !ok {
		return httpx.WriteProblem(c, fiber.StatusUnauthorized, "unauthorized", "Autenticação necessária", "")
	}
	return c.JSON(fiber.Map{
		"id": admin.ID, "name": admin.Name, "email": admin.Email,
		"role": admin.Role, "pixKey": admin.PixKey, "csrfToken": session.CSRFToken,
	})
}

func (sc *SessionController) Logout(c *fiber.Ctx) error {
	if err := sc.Sessions.Logout(c); err != nil {
		return httpx.WriteProblem(c, fiber.StatusInternalServerError, "session-delete-failed", "Não foi possível encerrar a sessão", "")
	}
	return c.SendStatus(fiber.StatusNoContent)
}
