package controllers

import (
	"kartfinance-api/services"
	"strconv"
	"strings"
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
	PilotID        *uint   `json:"PilotID"`        // piloto mensal (opcional)
	GuestPilotName string  `json:"GuestPilotName"` // nome do piloto convidado (opcional)
	Amount         float64 `json:"Amount"`
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

	var pilotID *uint
	var guestPilotID *uint

	guestName := strings.TrimSpace(input.GuestPilotName)
	if guestName != "" {
		// Piloto convidado: busca ou cria pelo nome
		guest, err := rc.Service.FindOrCreateGuestPilot(guestName)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		guestPilotID = &guest.ID
	} else if input.PilotID != nil {
		pilotID = input.PilotID
	} else {
		return c.Status(400).JSON(fiber.Map{"error": "Informe um piloto mensal ou o nome de um piloto convidado."})
	}

	entry, err := rc.Service.AddPilotToRace(uint(raceID), pilotID, guestPilotID, input.Amount)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(entry)
}

// GET /races/guest-pilots
func (rc *RaceController) GetGuestPilots(c *fiber.Ctx) error {
	guests, err := rc.Service.GetGuestPilots()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao buscar pilotos convidados."})
	}
	return c.JSON(guests)
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

// POST /races/entries/:entryId/reimbursements
func (rc *RaceController) AddEntryReimbursement(c *fiber.Ctx) error {
	entryID, _ := strconv.Atoi(c.Params("entryId"))
	var input addRaceEntryExpenseInput // mesma estrutura: Description + Amount
	if err := c.BodyParser(&input); err != nil || input.Description == "" || input.Amount <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos."})
	}
	reimbursement, err := rc.Service.AddEntryReimbursement(uint(entryID), input.Description, input.Amount)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(reimbursement)
}

// DELETE /races/entries/reimbursements/:reimbursementId
func (rc *RaceController) DeleteEntryReimbursement(c *fiber.Ctx) error {
	reimbursementID, _ := strconv.Atoi(c.Params("reimbursementId"))
	if err := rc.Service.RemoveEntryReimbursement(uint(reimbursementID)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao remover reembolso."})
	}
	return c.JSON(fiber.Map{"message": "Reembolso removido com sucesso!"})
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

// ─── Race Agenda ──────────────────────────────────────────────────────────────

type setAgendaSaldoInput struct {
	Saldo float64 `json:"Saldo"`
}

type addAgendaExpenseInput struct {
	Description string  `json:"Description"`
	Amount      float64 `json:"Amount"`
}

// GET /races/:id/agenda
func (rc *RaceController) GetAgenda(c *fiber.Ctx) error {
	raceID, _ := strconv.Atoi(c.Params("id"))
	agenda, err := rc.Service.GetAgenda(uint(raceID))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao buscar agenda."})
	}
	return c.JSON(agenda)
}

// PUT /races/:id/agenda/saldo
func (rc *RaceController) SetAgendaSaldo(c *fiber.Ctx) error {
	raceID, _ := strconv.Atoi(c.Params("id"))
	var input setAgendaSaldoInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos."})
	}
	agenda, err := rc.Service.SetAgendaSaldo(uint(raceID), input.Saldo)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(agenda)
}

// POST /races/:id/agenda/expenses
func (rc *RaceController) AddAgendaExpense(c *fiber.Ctx) error {
	raceID, _ := strconv.Atoi(c.Params("id"))
	var input addAgendaExpenseInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos."})
	}
	agenda, err := rc.Service.AddAgendaExpense(uint(raceID), input.Description, input.Amount)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(agenda)
}

// DELETE /races/agenda/expenses/:expenseId
func (rc *RaceController) DeleteAgendaExpense(c *fiber.Ctx) error {
	expenseID, _ := strconv.Atoi(c.Params("expenseId"))
	if err := rc.Service.DeleteAgendaExpense(uint(expenseID)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao remover gasto da agenda."})
	}
	return c.JSON(fiber.Map{"message": "Gasto removido da agenda."})
}
