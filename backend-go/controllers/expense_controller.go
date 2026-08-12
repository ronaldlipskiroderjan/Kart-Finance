package controllers

import (
	"kartfinance-api/models"
	"kartfinance-api/repository"
	"time"

	"github.com/gofiber/fiber/v2"
)

type ExpenseController struct {
	Repo *repository.AppRepository
}

func NewExpenseController(repo *repository.AppRepository) *ExpenseController {
	return &ExpenseController{Repo: repo}
}

// GetAllExpenses - GET /expenses
func (ec *ExpenseController) GetAllExpenses(c *fiber.Ctx) error {
	var expenses []models.Expense
	if err := ec.Repo.DB.Find(&expenses).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(expenses)
}

// CreateExpense - POST /expenses
func (ec *ExpenseController) CreateExpense(c *fiber.Ctx) error {
	type ExpenseInput struct {
		Description string       `json:"description"`
		Amount      models.Money `json:"amount"`
		Pilot       struct {
			ID uint `json:"id"`
		} `json:"pilot"`
		Year  int `json:"year"`
		Month int `json:"month"`
	}

	var input ExpenseInput
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

	expense := models.Expense{
		Description:     input.Description,
		Amount:          input.Amount,
		PilotID:         input.Pilot.ID,
		ReferencePeriod: referencePeriod,
		CreatedAt:       legacyCreatedAt,
	}

	// Salvar no Banco
	if err := ec.Repo.DB.Create(&expense).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao salvar despesa"})
	}

	return c.Status(fiber.StatusCreated).JSON(expense)
}

// DeleteExpense - DELETE /expenses/:id
func (ec *ExpenseController) DeleteExpense(c *fiber.Ctx) error {
	id := c.Params("id")

	result := ec.Repo.DB.Delete(&models.Expense{}, id)

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Despesa não encontrada"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
