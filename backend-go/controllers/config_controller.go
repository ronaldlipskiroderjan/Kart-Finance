package controllers

import (
	"kartfinance-api/models"
	"kartfinance-api/repository"

	"github.com/gofiber/fiber/v2"
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
	cc.Repo.DB.FirstOrCreate(&cfg, models.SystemConfig{ID: 1})
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
	cc.Repo.DB.FirstOrCreate(&cfg, models.SystemConfig{ID: 1})
	cc.Repo.DB.Model(&cfg).Update("pix_key", body.PixKey)

	return c.JSON(fiber.Map{"pixKey": body.PixKey})
}
