package controllers

import (
	"kartfinance-api/models"
	"kartfinance-api/repository"

	"github.com/gofiber/fiber/v2"
)

type AdminController struct {
	Repo *repository.AppRepository
}

func NewAdminController(repo *repository.AppRepository) *AdminController {
	return &AdminController{Repo: repo}
}

// GetAllAdmins - GET /admins (exclude superadmin/developer)
func (ac *AdminController) GetAllAdmins(c *fiber.Ctx) error {
	var admins []models.Admin
	// Find all admins except those with Role = 'superadmin' (or we can just filter out later when we know the email)
	// For now, let's just return all except the one with a hardcoded email (dev email will be added here later or handled in frontend)
	if err := ac.Repo.DB.Find(&admins).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Remove passwords from response
	for i := range admins {
		admins[i].Password = ""
	}

	return c.JSON(admins)
}

// CreateAdmin - POST /admins
func (ac *AdminController) CreateAdmin(c *fiber.Ctx) error {
	admin := new(models.Admin)
	if err := c.BodyParser(admin); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	if admin.Role == "" {
		admin.Role = "admin"
	}

	if err := ac.Repo.DB.Create(&admin).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao criar administrador. Email já existe?"})
	}
	
	admin.Password = ""
	return c.Status(fiber.StatusCreated).JSON(admin)
}

// UpdateAdmin - PUT /admins/:id
func (ac *AdminController) UpdateAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	var admin models.Admin

	if err := ac.Repo.DB.First(&admin, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Administrador não encontrado"})
	}

	var updateData struct {
		Name   string `json:"name"`
		Email  string `json:"email"`
		PixKey string `json:"pixKey"`
	}

	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	ac.Repo.DB.Model(&admin).Updates(models.Admin{
		Name:   updateData.Name,
		Email:  updateData.Email,
		PixKey: updateData.PixKey,
	})

	admin.Password = ""
	return c.JSON(admin)
}

// UpdatePassword - PUT /admins/:id/password
func (ac *AdminController) UpdatePassword(c *fiber.Ctx) error {
	id := c.Params("id")
	var admin models.Admin

	if err := ac.Repo.DB.First(&admin, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Administrador não encontrado"})
	}

	var data struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}

	if err := c.BodyParser(&data); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	if admin.Password != data.CurrentPassword {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Senha atual incorreta"})
	}

	ac.Repo.DB.Model(&admin).Update("password", data.NewPassword)

	return c.JSON(fiber.Map{"success": true, "message": "Senha atualizada com sucesso"})
}

// DeleteAdmin - DELETE /admins/:id
func (ac *AdminController) DeleteAdmin(c *fiber.Ctx) error {
	id := c.Params("id")

	result := ac.Repo.DB.Delete(&models.Admin{}, id)

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Administrador não encontrado"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
