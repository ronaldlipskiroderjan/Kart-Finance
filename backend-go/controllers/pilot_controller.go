package controllers

import (
	"kartfinance-api/models"
	"kartfinance-api/repository"

	"github.com/gofiber/fiber/v2"
)

type PilotController struct {
	Repo *repository.AppRepository
}

func NewPilotController(repo *repository.AppRepository) *PilotController {
	return &PilotController{Repo: repo}
}

// GetAllPilots - GET /pilots
func (pc *PilotController) GetAllPilots(c *fiber.Ctx) error {
	var pilots []models.Pilot
	if err := pc.Repo.DB.Preload("Expenses").Preload("Reimbursements").Preload("ClosingHistories").Find(&pilots).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(pilots)
}

// GetPilotByID - GET /pilots/:id
func (pc *PilotController) GetPilotById(c *fiber.Ctx) error {
	id := c.Params("id")
	var pilot models.Pilot

	if arr := pc.Repo.DB.Preload("Expenses").Preload("Reimbursements").Preload("ClosingHistories").First(&pilot, id).Error; arr != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Piloto não encontrado"})
	}
	return c.JSON(pilot)
}

// CreatePilot - POST /pilots
func (pc *PilotController) CreatePilot(c *fiber.Ctx) error {
	pilot := new(models.Pilot)
	if err := c.BodyParser(pilot); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	if err := pc.Repo.DB.Create(&pilot).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(pilot)
}

// UpdatePilot - PUT /pilots/:id
func (pc *PilotController) UpdatePilot(c *fiber.Ctx) error {
	id := c.Params("id")
	var pilot models.Pilot

	if err := pc.Repo.DB.First(&pilot, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Piloto não encontrado"})
	}

	updateData := new(models.Pilot)
	if err := c.BodyParser(updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	pc.Repo.DB.Model(&pilot).Updates(updateData)

	return c.JSON(pilot)
}

// DeletePilot - DELETE /pilots/:id
func (pc *PilotController) DeletePilot(c *fiber.Ctx) error {
	id := c.Params("id")

	result := pc.Repo.DB.Delete(&models.Pilot{}, id)

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Piloto não encontrado"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
