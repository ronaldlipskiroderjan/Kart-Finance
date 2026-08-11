package controllers

import (
	"errors"
	"kartfinance-api/models"
	"kartfinance-api/repository"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ConfigController struct {
	Repo *repository.AppRepository
}

func NewConfigController(repo *repository.AppRepository) *ConfigController {
	return &ConfigController{Repo: repo}
}

// GetConfig - GET /config
func (cc *ConfigController) GetConfig(c *fiber.Ctx) error {
	var cfg models.SystemConfig
	err := cc.Repo.DB.First(&cfg, 1).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return c.JSON(fiber.Map{"pixKey": ""})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao buscar configuração"})
	}
	return c.JSON(fiber.Map{"pixKey": cfg.PixKey})
}

// UpdateConfig - PUT /config
func (cc *ConfigController) UpdateConfig(c *fiber.Ctx) error {
	var body struct {
		PixKey string `json:"pixKey"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	var cfg models.SystemConfig
	if err := cc.Repo.DB.FirstOrCreate(&cfg, models.SystemConfig{ID: 1}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao criar configuração"})
	}
	if err := cc.Repo.DB.Model(&cfg).Update("pix_key", body.PixKey).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao atualizar configuração"})
	}

	return c.JSON(fiber.Map{"pixKey": body.PixKey})
}
