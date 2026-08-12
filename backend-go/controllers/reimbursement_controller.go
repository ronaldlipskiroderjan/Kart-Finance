package controllers

import (
	"kartfinance-api/models"
	"kartfinance-api/repository"
	"time"

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

	if err := rc.Repo.DB.Find(&reimbursements).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(reimbursements)
}

// CreateReimbursement - POST /reimbursements
func (rc *ReimbursementController) CreateReimbursement(c *fiber.Ctx) error {
	type ReimbursementInput struct {
		Description string       `json:"description"`
		Amount      models.Money `json:"amount"`
		Pilot       struct {
			ID uint `json:"id"`
		} `json:"pilot"`
		Year  int `json:"year"`
		Month int `json:"month"`
	}

	var input ReimbursementInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}
	if input.Pilot.ID == 0 || input.Amount <= 0 || input.Description == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Piloto, descrição e valor positivo são obrigatórios"})
	}

	now := time.Now()
	year, month := input.Year, input.Month
	if year == 0 && month == 0 {
		year, month = now.Year(), int(now.Month())
	}
	if year < 2000 || year > 2200 || month < 1 || month > 12 {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Período contábil inválido"})
	}
	referencePeriod := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	legacyCreatedAt := time.Date(year, time.Month(month), 15, 12, 0, 0, 0, time.Local)

	// Monta a entidade
	reimbursement := models.Reimbursement{
		Description:     input.Description,
		Amount:          input.Amount,
		PilotID:         input.Pilot.ID,
		ReferencePeriod: referencePeriod,
		CreatedAt:       legacyCreatedAt,
	}

	//Salva no Banco
	if err := rc.Repo.DB.Create(&reimbursement).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao salvar reembolso"})
	}

	return c.Status(fiber.StatusCreated).JSON(reimbursement)
}

// DeleteReimbursement - DELETE /reimbursements/:id
func (rc *ReimbursementController) DeleteReimbursement(c *fiber.Ctx) error {
	id := c.Params("id")

	result := rc.Repo.DB.Delete(&models.Reimbursement{}, id)

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Reembolso não encontrado"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
