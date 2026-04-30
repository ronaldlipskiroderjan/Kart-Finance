package controllers

import (
	"kartfinance-api/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type ClosingController struct {
	Service *services.ClosingService
}

func NewClosingController(service *services.ClosingService) *ClosingController {
	return &ClosingController{Service: service}
}

// GetSummary - GET /closing/:pilot_id
func (cc *ClosingController) GetSummary(c *fiber.Ctx) error {
	pilotID, _ := strconv.Atoi(c.Params("pilot_id"))
	year, _ := strconv.Atoi(c.Query("year"))
	month, _ := strconv.Atoi(c.Query("month"))

	summary, err := cc.Service.GenerateMonthlySummary(uint(pilotID), year, month)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Pilot não encontrado!"})
	}

	return c.JSON(summary)
}

// Finalize - POST /closing/:pilot_id/finalize
func (cc *ClosingController) Finalize(c *fiber.Ctx) error {
	pilotID, _ := strconv.Atoi(c.Params("pilot_id"))
	year, _ := strconv.Atoi(c.Query("year"))
	month, _ := strconv.Atoi(c.Query("month"))

	history, err := cc.Service.FinalizeClosing(uint(pilotID), year, month)
	if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(history)
}

// GetHistory - GET /closing/:pilotId/history
func (cc *ClosingController) GetHistory(c *fiber.Ctx) error {
	pilotID, _ := strconv.Atoi(c.Params("pilotId"))

	history, err := cc.Service.GetPilotHistory(uint(pilotID))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(history)
}

// Pay - PUT /closing/:pilot_id/pay
func (cc *ClosingController) Pay(c *fiber.Ctx) error {
	closingID, _ := strconv.Atoi(c.Params("closingId"))

	if err := cc.Service.MarkAsPaid(uint(closingID)); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Erro ao registrar pagamento!"})
	}

	return c.JSON(fiber.Map{"message": "Pagamento registrado com sucesso!"})
}