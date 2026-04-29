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