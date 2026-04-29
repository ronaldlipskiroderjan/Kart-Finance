package controllers

import (
	"kartfinance-api/models"
	"kartfinance-api/repository"

	"github.com/gofiber/fiber/v2"
)

type ExpenseController struct {
	Repo *repository.AppRepository
}

func NewExpenseController(repo *repository.AppRepository) *ExpenseController {
	return &ExpenseController{Repo: repo}
}

//GetAllExpenses - GET /expenses
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
			Description string  `json:"description"`
			Amount      float64 `json:"amount"`
			Pilot       struct {
					ID uint `json:"id"`
			} `json:"pilot"`
	}

	var input ExpenseInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	expense := models.Expense{
			Description: input.Description,
			Amount:      input.Amount,
			PilotID:     input.Pilot.ID,
	}

	// Salvar no Banco
	if err := ec.Repo.DB.Create(&expense).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao salvar despesa"})
	}

	return c.Status(fiber.StatusCreated).JSON(expense)
}

//DeleteExpense - DELETE /expenses/:id
func (ec *ExpenseController) DeleteExpense(c *fiber.Ctx) error {
	id := c.Params("id")

	result := ec.Repo.DB.Delete(&models.Expense{}, id)

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Despesa não encontrada"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}