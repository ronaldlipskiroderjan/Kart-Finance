package controllers

import (
	"errors"
	"fmt"
	"time"

	"kartfinance-api/internal/httpx"
	"kartfinance-api/models"
	"kartfinance-api/services"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type V1Controller struct {
	Pilots  *services.PilotService
	Finance *services.FinanceService
	Closing *services.ClosingService
}

func NewV1Controller(pilots *services.PilotService, finance *services.FinanceService, closing *services.ClosingService) *V1Controller {
	return &V1Controller{Pilots: pilots, Finance: finance, Closing: closing}
}

type pilotPayload struct {
	Name         *string       `json:"name"`
	Category     *string       `json:"category"`
	BaseFee      *models.Money `json:"baseFee"`
	Observations *string       `json:"observations"`
	ClosingDay   *int          `json:"closingDay"`
}

type pilotResponse struct {
	ID           uint         `json:"id"`
	Name         string       `json:"name"`
	Category     string       `json:"category"`
	BaseFee      models.Money `json:"baseFee"`
	Observations string       `json:"observations"`
	ClosingDay   int          `json:"closingDay"`
	CreatedAt    time.Time    `json:"createdAt"`
}

type pilotOverviewResponse struct {
	pilotResponse
	Expenses       []models.Expense        `json:"expenses"`
	Reimbursements []models.Reimbursement  `json:"reimbursements"`
	ClosingHistory []models.ClosingHistory `json:"closingHistories"`
	Status         string                  `json:"status"`
}

type entryPayload struct {
	Description string       `json:"description"`
	Amount      models.Money `json:"amount"`
	Period      string       `json:"period"`
}

type financialEntryResponse struct {
	ID              uint         `json:"id"`
	PilotID         uint         `json:"pilotId"`
	Description     string       `json:"description"`
	Amount          models.Money `json:"amount"`
	ReferencePeriod string       `json:"referencePeriod"`
	CreatedAt       time.Time    `json:"createdAt"`
}

func (vc *V1Controller) ListPilots(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	size := c.QueryInt("size", 20)
	result, err := vc.Pilots.List(page, size, c.Query("search"))
	if err != nil {
		return internalProblem(c, err)
	}
	items := make([]pilotResponse, 0, len(result.Items))
	for _, pilot := range result.Items {
		items = append(items, toPilotResponse(pilot))
	}
	return c.JSON(httpx.Collection[[]pilotResponse]{
		Data: items,
		Meta: fiber.Map{"page": result.Page, "size": result.Size, "total": result.Total},
	})
}

func (vc *V1Controller) ListPilotOverviews(c *fiber.Ctx) error {
	pilots, err := vc.Pilots.ListOverview()
	if err != nil {
		return internalProblem(c, err)
	}
	items := make([]pilotOverviewResponse, 0, len(pilots))
	for _, pilot := range pilots {
		status := "EM DIA"
		for _, closing := range pilot.ClosingHistories {
			if closing.Status == models.StatusAtrasado {
				status = "ATRASADO"
				break
			}
			if closing.Status == models.StatusPendente {
				status = "PENDENTE"
			}
		}
		items = append(items, pilotOverviewResponse{
			pilotResponse: toPilotResponse(pilot), Expenses: pilot.Expenses,
			Reimbursements: pilot.Reimbursements, ClosingHistory: pilot.ClosingHistories, Status: status,
		})
	}
	return c.JSON(httpx.Collection[[]pilotOverviewResponse]{Data: items})
}

func (vc *V1Controller) GetPilot(c *fiber.Ctx) error {
	id, err := httpx.ParseID(c, "pilotId")
	if err != nil {
		return badRequest(c, err)
	}
	pilot, err := vc.Pilots.Get(id)
	if err != nil {
		return serviceProblem(c, err, "Piloto não encontrado")
	}
	return c.JSON(toPilotResponse(*pilot))
}

func (vc *V1Controller) CreatePilot(c *fiber.Ctx) error {
	var body pilotPayload
	if err := c.BodyParser(&body); err != nil {
		return badRequest(c, err)
	}
	if body.Name == nil || body.BaseFee == nil {
		return validationProblem(c, "name e baseFee são obrigatórios")
	}
	closingDay := 10
	if body.ClosingDay != nil {
		closingDay = *body.ClosingDay
	}
	pilot, err := vc.Pilots.Create(services.PilotInput{
		Name: *body.Name, Category: stringValue(body.Category), BaseFee: *body.BaseFee,
		Observations: stringValue(body.Observations), ClosingDay: closingDay,
	})
	if err != nil {
		return validationProblem(c, err.Error())
	}
	c.Location(fmt.Sprintf("/api/v1/pilots/%d", pilot.ID))
	return c.Status(fiber.StatusCreated).JSON(toPilotResponse(*pilot))
}

func (vc *V1Controller) UpdatePilot(c *fiber.Ctx) error {
	id, err := httpx.ParseID(c, "pilotId")
	if err != nil {
		return badRequest(c, err)
	}
	current, err := vc.Pilots.Get(id)
	if err != nil {
		return serviceProblem(c, err, "Piloto não encontrado")
	}
	var body pilotPayload
	if err := c.BodyParser(&body); err != nil {
		return badRequest(c, err)
	}
	input := services.PilotInput{
		Name: current.Name, Category: current.Category, BaseFee: current.BaseFee,
		Observations: current.Observations, ClosingDay: current.ClosingDay,
	}
	if body.Name != nil {
		input.Name = *body.Name
	}
	if body.Category != nil {
		input.Category = *body.Category
	}
	if body.BaseFee != nil {
		input.BaseFee = *body.BaseFee
	}
	if body.Observations != nil {
		input.Observations = *body.Observations
	}
	if body.ClosingDay != nil {
		input.ClosingDay = *body.ClosingDay
	}
	updated, err := vc.Pilots.Update(id, input)
	if err != nil {
		return validationProblem(c, err.Error())
	}
	return c.JSON(toPilotResponse(*updated))
}

func (vc *V1Controller) DeletePilot(c *fiber.Ctx) error {
	id, err := httpx.ParseID(c, "pilotId")
	if err != nil {
		return badRequest(c, err)
	}
	if err := vc.Pilots.Delete(id); err != nil {
		return serviceProblem(c, err, "Piloto não encontrado")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (vc *V1Controller) ListExpenses(c *fiber.Ctx) error {
	pilotID, err := httpx.ParseID(c, "pilotId")
	if err != nil {
		return badRequest(c, err)
	}
	entries, err := vc.Finance.ListExpenses(pilotID, c.Query("period"))
	if err != nil {
		return validationProblem(c, err.Error())
	}
	data := make([]financialEntryResponse, 0, len(entries))
	for _, entry := range entries {
		data = append(data, expenseResponse(entry))
	}
	return c.JSON(httpx.Collection[[]financialEntryResponse]{Data: data})
}

func (vc *V1Controller) CreateExpense(c *fiber.Ctx) error {
	pilotID, err := httpx.ParseID(c, "pilotId")
	if err != nil {
		return badRequest(c, err)
	}
	var body entryPayload
	if err := c.BodyParser(&body); err != nil {
		return badRequest(c, err)
	}
	entry, err := vc.Finance.CreateExpense(pilotID, services.FinancialEntryInput{Description: body.Description, Amount: body.Amount, Period: body.Period})
	if err != nil {
		return serviceProblem(c, err, err.Error())
	}
	c.Location(fmt.Sprintf("/api/v1/expenses/%d", entry.ID))
	return c.Status(fiber.StatusCreated).JSON(expenseResponse(*entry))
}

func (vc *V1Controller) DeleteExpense(c *fiber.Ctx) error {
	id, err := httpx.ParseID(c, "expenseId")
	if err != nil {
		return badRequest(c, err)
	}
	if err := vc.Finance.DeleteExpense(id); err != nil {
		return serviceProblem(c, err, "Despesa não encontrada")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (vc *V1Controller) ListReimbursements(c *fiber.Ctx) error {
	pilotID, err := httpx.ParseID(c, "pilotId")
	if err != nil {
		return badRequest(c, err)
	}
	entries, err := vc.Finance.ListReimbursements(pilotID, c.Query("period"))
	if err != nil {
		return validationProblem(c, err.Error())
	}
	data := make([]financialEntryResponse, 0, len(entries))
	for _, entry := range entries {
		data = append(data, reimbursementResponse(entry))
	}
	return c.JSON(httpx.Collection[[]financialEntryResponse]{Data: data})
}

func (vc *V1Controller) CreateReimbursement(c *fiber.Ctx) error {
	pilotID, err := httpx.ParseID(c, "pilotId")
	if err != nil {
		return badRequest(c, err)
	}
	var body entryPayload
	if err := c.BodyParser(&body); err != nil {
		return badRequest(c, err)
	}
	entry, err := vc.Finance.CreateReimbursement(pilotID, services.FinancialEntryInput{Description: body.Description, Amount: body.Amount, Period: body.Period})
	if err != nil {
		return serviceProblem(c, err, err.Error())
	}
	c.Location(fmt.Sprintf("/api/v1/reimbursements/%d", entry.ID))
	return c.Status(fiber.StatusCreated).JSON(reimbursementResponse(*entry))
}

func (vc *V1Controller) DeleteReimbursement(c *fiber.Ctx) error {
	id, err := httpx.ParseID(c, "reimbursementId")
	if err != nil {
		return badRequest(c, err)
	}
	if err := vc.Finance.DeleteReimbursement(id); err != nil {
		return serviceProblem(c, err, "Reembolso não encontrado")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (vc *V1Controller) PreviewClosing(c *fiber.Ctx) error {
	pilotID, err := httpx.ParseID(c, "pilotId")
	if err != nil {
		return badRequest(c, err)
	}
	year, month, err := parsePeriod(c.Query("period"))
	if err != nil {
		return validationProblem(c, err.Error())
	}
	summary, err := vc.Closing.GenerateMonthlySummary(pilotID, year, month)
	if err != nil {
		return serviceProblem(c, err, "Não foi possível calcular o fechamento")
	}
	return c.JSON(summary)
}

func (vc *V1Controller) ListClosings(c *fiber.Ctx) error {
	pilotID, err := httpx.ParseID(c, "pilotId")
	if err != nil {
		return badRequest(c, err)
	}
	closings, err := vc.Closing.GetPilotHistory(pilotID)
	if err != nil {
		return internalProblem(c, err)
	}
	return c.JSON(httpx.Collection[[]models.ClosingHistory]{Data: closings})
}

func (vc *V1Controller) CreateClosing(c *fiber.Ctx) error {
	pilotID, err := httpx.ParseID(c, "pilotId")
	if err != nil {
		return badRequest(c, err)
	}
	var body struct {
		Period string `json:"period"`
	}
	if err := c.BodyParser(&body); err != nil {
		return badRequest(c, err)
	}
	year, month, err := parsePeriod(body.Period)
	if err != nil {
		return validationProblem(c, err.Error())
	}
	closing, err := vc.Closing.FinalizeClosing(pilotID, year, month)
	if err != nil {
		if errors.Is(err, services.ErrClosingAlreadyExists) {
			return httpx.WriteProblem(c, fiber.StatusConflict, "closing-already-exists", "Fechamento já existe", err.Error())
		}
		return internalProblem(c, err)
	}
	c.Location(fmt.Sprintf("/api/v1/closings/%d", closing.ID))
	return c.Status(fiber.StatusCreated).JSON(closing)
}

func (vc *V1Controller) PayClosing(c *fiber.Ctx) error {
	id, err := httpx.ParseID(c, "closingId")
	if err != nil {
		return badRequest(c, err)
	}
	if err := vc.Closing.MarkAsPaid(id); err != nil {
		return serviceProblem(c, err, "Fechamento não encontrado")
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"closingId": id, "status": models.StatusPago})
}

func (vc *V1Controller) DeleteClosing(c *fiber.Ctx) error {
	id, err := httpx.ParseID(c, "closingId")
	if err != nil {
		return badRequest(c, err)
	}
	if err := vc.Closing.DeleteClosing(id); err != nil {
		return serviceProblem(c, err, "Fechamento não encontrado")
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func toPilotResponse(pilot models.Pilot) pilotResponse {
	return pilotResponse{ID: pilot.ID, Name: pilot.Name, Category: pilot.Category, BaseFee: pilot.BaseFee,
		Observations: pilot.Observations, ClosingDay: pilot.ClosingDay, CreatedAt: pilot.CreatedAt}
}

func expenseResponse(entry models.Expense) financialEntryResponse {
	return financialEntryResponse{ID: entry.ID, PilotID: entry.PilotID, Description: entry.Description,
		Amount: entry.Amount, ReferencePeriod: entry.ReferencePeriod.Format("2006-01"), CreatedAt: entry.CreatedAt}
}

func reimbursementResponse(entry models.Reimbursement) financialEntryResponse {
	return financialEntryResponse{ID: entry.ID, PilotID: entry.PilotID, Description: entry.Description,
		Amount: entry.Amount, ReferencePeriod: entry.ReferencePeriod.Format("2006-01"), CreatedAt: entry.CreatedAt}
}

func parsePeriod(period string) (int, int, error) {
	parsed, err := time.Parse("2006-01", period)
	if err != nil {
		return 0, 0, fmt.Errorf("período deve usar o formato AAAA-MM")
	}
	return parsed.Year(), int(parsed.Month()), nil
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func badRequest(c *fiber.Ctx, err error) error {
	return httpx.WriteProblem(c, fiber.StatusBadRequest, "invalid-request", "Requisição inválida", err.Error())
}

func validationProblem(c *fiber.Ctx, detail string) error {
	return httpx.WriteProblem(c, fiber.StatusUnprocessableEntity, "validation-error", "Dados inválidos", detail)
}

func serviceProblem(c *fiber.Ctx, err error, detail string) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return httpx.WriteProblem(c, fiber.StatusNotFound, "resource-not-found", "Recurso não encontrado", detail)
	}
	return validationProblem(c, detail)
}

func internalProblem(c *fiber.Ctx, err error) error {
	return httpx.WriteProblem(c, fiber.StatusInternalServerError, "internal-error", "Erro interno", err.Error())
}
