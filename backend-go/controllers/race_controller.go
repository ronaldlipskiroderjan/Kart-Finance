package controllers

import (
	"kartfinance-api/services"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type RaceController struct {
	Service *services.RaceService
}

func NewRaceController(service *services.RaceService) *RaceController {
	return &RaceController{Service: service}
}

type createRaceWeekendInput struct {
	Name        string `json:"Name"`
	Date        string `json:"Date"`
	Description string `json:"Description"`
}

type addRaceEntryInput struct {
	PilotID uint    `json:"PilotID"`
	Amount  float64 `json:"Amount"`
}

type updateRaceEntryInput struct {
	Amount float64 `json:"Amount"`
}

type addRaceEntryExpenseInput struct {
	Description string  `json:"Description"`
	Amount      float64 `json:"Amount"`
}

// GET /races
func (rc *RaceController) GetAll(c *fiber.Ctx) error {
	races, err := rc.Service.GetAllRaceWeekends()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao buscar corridas."})
	}
	return c.JSON(races)
}

// GET /races/pilot/:pilotId/entries
func (rc *RaceController) GetEntriesForPilot(c *fiber.Ctx) error {
	pilotID, _ := strconv.Atoi(c.Params("pilotId"))
	entries, err := rc.Service.Repo.FindRaceEntriesByPilotID(uint(pilotID))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao buscar corridas do piloto."})
	}
	return c.JSON(entries)
}

// GET /races/:id
func (rc *RaceController) GetByID(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	race, err := rc.Service.GetRaceWeekendByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Fim de semana não encontrado."})
	}
	return c.JSON(race)
}

// POST /races
func (rc *RaceController) Create(c *fiber.Ctx) error {
	var input createRaceWeekendInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos."})
	}
	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Data inválida. Use o formato AAAA-MM-DD."})
	}
	race, err := rc.Service.CreateRaceWeekend(input.Name, input.Description, date)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(race)
}

// PUT /races/:id
func (rc *RaceController) Update(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	var input createRaceWeekendInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos."})
	}
	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Data inválida. Use o formato AAAA-MM-DD."})
	}
	race, err := rc.Service.UpdateRaceWeekend(uint(id), input.Name, input.Description, date)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(race)
}

// DELETE /races/:id
func (rc *RaceController) Delete(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	if err := rc.Service.DeleteRaceWeekend(uint(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao excluir corrida."})
	}
	return c.JSON(fiber.Map{"message": "Corrida excluída com sucesso!"})
}

// POST /races/:id/entries
func (rc *RaceController) AddEntry(c *fiber.Ctx) error {
	raceID, _ := strconv.Atoi(c.Params("id"))
	var input addRaceEntryInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos."})
	}
	entry, err := rc.Service.AddPilotToRace(uint(raceID), input.PilotID, input.Amount)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(entry)
}

// PUT /races/entries/:entryId
func (rc *RaceController) UpdateEntry(c *fiber.Ctx) error {
	entryID, _ := strconv.Atoi(c.Params("entryId"))
	var input updateRaceEntryInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos."})
	}
	entry, err := rc.Service.UpdateRaceEntry(uint(entryID), input.Amount)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(entry)
}

// DELETE /races/entries/:entryId
func (rc *RaceController) RemoveEntry(c *fiber.Ctx) error {
	entryID, _ := strconv.Atoi(c.Params("entryId"))
	if err := rc.Service.RemovePilotFromRace(uint(entryID)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao remover piloto."})
	}
	return c.JSON(fiber.Map{"message": "Piloto removido com sucesso!"})
}

// POST /races/entries/:entryId/expenses
func (rc *RaceController) AddEntryExpense(c *fiber.Ctx) error {
	entryID, _ := strconv.Atoi(c.Params("entryId"))
	var input addRaceEntryExpenseInput
	if err := c.BodyParser(&input); err != nil || input.Description == "" || input.Amount <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos."})
	}
	expense, err := rc.Service.AddEntryExpense(uint(entryID), input.Description, input.Amount)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(expense)
}

// DELETE /races/entries/expenses/:expenseId
func (rc *RaceController) DeleteEntryExpense(c *fiber.Ctx) error {
	expenseID, _ := strconv.Atoi(c.Params("expenseId"))
	if err := rc.Service.RemoveEntryExpense(uint(expenseID)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao remover gasto."})
	}
	return c.JSON(fiber.Map{"message": "Gasto removido com sucesso!"})
}

// PUT /races/entries/:entryId/pay
func (rc *RaceController) PayEntry(c *fiber.Ctx) error {
	entryID, _ := strconv.Atoi(c.Params("entryId"))
	entry, err := rc.Service.MarkEntryAsPaid(uint(entryID))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(entry)
}
