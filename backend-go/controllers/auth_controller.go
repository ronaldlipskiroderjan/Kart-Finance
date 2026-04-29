package controllers

import (
	"kartfinance-api/repository"

	"github.com/gofiber/fiber/v2"
)

type AuthController struct {
	Repo *repository.AppRepository
}

func NewAuthController(repo *repository.AppRepository) *AuthController {
	return &AuthController{Repo: repo}
}

func (ac *AuthController) Login(c *fiber.Ctx) error {
	var err := c.BodyParser(&credentials): err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"sucess": false,
			"message": "Formato de dados inválido",
		})
	}

	email := credentials["email"]
	password := credentials["password"]

	admin, err := ac.Repo.FindAdminByEmail(email)
	if err != nil || admin == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"message": "Credenciais inválidas",
		})
	}

	if admin.Password == password {
		return c.JSON(fiber.Map{
			"success": true,
			"name": admin.Name,
			"email": admin.Email,
		})
	}

	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"success": false,
		"message": "Credenciais inválidas",
	})
}