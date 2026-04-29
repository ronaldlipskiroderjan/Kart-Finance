package controllers

import (
	"kartfinance-api/models"
	"kartfinance-api/repository"

	"github.com/gofiber/fiber/v2"
)

type ReimbursementController struct {
	Repo *repository.AppRepository
}

func NewReimbursementController(repo *repository.AppRepository) *ReimbursementController {
	return &ReimbursementController{Repo: repo}
}

// GetAllReimbursements - GET /reimbursements
func (rc *ReimbursementController) GetAllReimbursements(c *fiber.Ctx) error {
	var reimbursements []models.Reimbursement

	if err := rc.Repo.BD.Find(&reimbursements).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(reimbursements)
}

// CreateReimbursement - POST /reimbursements
func (rc *ReimbursementController) CreateReimbursement(c *fiber.Ctx) error {
	type ReimbursementInput struct {
		Description string  `json:"description"`
		Amount      float64 `json:"amount"`
		Pilot       struct {
				ID uint `json:"id"`
		} `json:"pilot"`
	}

	var input ReimbursementInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Monta a entidade
	reimbursement := models.Reimbursement{
		Description: input.Description,
		Amount:      input.Amount,
		PilotID:     input.Pilot.ID,
	}

	//Salva no Banco
	if err := rc.Repo.BD.Create(&reimbursement).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao salvar reembolso"})
	}

	return c.Status(fiber.StatusCreated).JSON(reimbursement)
}

// DeleteReimbursement - DELETE /reimbursements/:id
func (rc *ReimbursementController) DeleteReimbursement(c *fiber.Ctx) error {
	id := c.Params("id")

	result := rc.Repo.BD.Delete(&models.Reimbursement{}, id)

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Reembolso não encontrado"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}