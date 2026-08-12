package services

import (
	"errors"
	"strings"
	"time"

	"kartfinance-api/models"
	"kartfinance-api/repository"
)

type RaceService struct {
	Repo *repository.AppRepository
}

func NewRaceService(repo *repository.AppRepository) *RaceService {
	return &RaceService{Repo: repo}
}

func (s *RaceService) CreateRaceWeekend(name, description string, date time.Time) (*models.RaceWeekend, error) {
	if strings.TrimSpace(name) == "" {
		return nil, errors.New("nome do fim de semana é obrigatório")
	}
	name = strings.TrimSpace(name)
	description = strings.TrimSpace(description)

	race := &models.RaceWeekend{
		Name:        name,
		Description: description,
		Date:        date,
	}
	if err := s.Repo.CreateRaceWeekend(race); err != nil {
		return nil, err
	}
	return race, nil
}

func (s *RaceService) GetAllRaceWeekends() ([]models.RaceWeekend, error) {
	return s.Repo.FindAllRaceWeekends()
}

func (s *RaceService) GetRaceWeekendByID(id uint) (*models.RaceWeekend, error) {
	return s.Repo.FindRaceWeekendByID(id)
}

func (s *RaceService) UpdateRaceWeekend(id uint, name, description string, date time.Time) (*models.RaceWeekend, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("nome do fim de semana é obrigatório")
	}
	race, err := s.Repo.FindRaceWeekendByID(id)
	if err != nil {
		return nil, errors.New("fim de semana não encontrado")
	}
	race.Name = name
	race.Description = strings.TrimSpace(description)
	race.Date = date
	if err := s.Repo.UpdateRaceWeekend(race); err != nil {
		return nil, err
	}
	return race, nil
}

func (s *RaceService) DeleteRaceWeekend(id uint) error {
	return s.Repo.DeleteRaceWeekend(id)
}

func (s *RaceService) AddPilotToRace(raceWeekendID uint, pilotID *uint, guestPilotID *uint, amount models.Money) (*models.RaceEntry, error) {
	if amount <= 0 {
		return nil, errors.New("valor deve ser maior que zero")
	}
	if pilotID != nil {
		exists, err := s.Repo.ExistsRaceEntryForPilot(raceWeekendID, *pilotID)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("piloto já adicionado a este fim de semana")
		}
	} else if guestPilotID != nil {
		exists, err := s.Repo.ExistsRaceEntryForGuestPilot(raceWeekendID, *guestPilotID)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("piloto convidado já adicionado a este fim de semana")
		}
	} else {
		return nil, errors.New("informe um piloto mensal ou um nome de piloto convidado")
	}

	entry := &models.RaceEntry{
		RaceWeekendID: raceWeekendID,
		PilotID:       pilotID,
		GuestPilotID:  guestPilotID,
		Amount:        amount,
		Status:        models.RaceStatusPendente,
		DueDate:       time.Now().AddDate(0, 0, 7),
	}
	if err := s.Repo.CreateRaceEntry(entry); err != nil {
		return nil, err
	}

	return s.Repo.FindRaceEntryByID(entry.ID)
}

func (s *RaceService) GetGuestPilots() ([]models.GuestPilot, error) {
	return s.Repo.FindAllGuestPilots()
}

func (s *RaceService) FindOrCreateGuestPilot(name string) (*models.GuestPilot, error) {
	return s.Repo.FindOrCreateGuestPilot(name)
}

func (s *RaceService) UpdateRaceEntry(entryID uint, amount models.Money) (*models.RaceEntry, error) {
	if amount <= 0 {
		return nil, errors.New("valor deve ser maior que zero")
	}
	entry, err := s.Repo.FindRaceEntryByID(entryID)
	if err != nil {
		return nil, errors.New("entrada não encontrada")
	}
	entry.Amount = amount
	if err := s.Repo.UpdateRaceEntry(entry); err != nil {
		return nil, err
	}
	return entry, nil
}

func (s *RaceService) RemovePilotFromRace(entryID uint) error {
	return s.Repo.DeleteRaceEntry(entryID)
}

func (s *RaceService) AddEntryExpense(entryID uint, description string, amount models.Money) (*models.RaceEntryExpense, error) {
	description = strings.TrimSpace(description)
	if description == "" {
		return nil, errors.New("descrição é obrigatória")
	}
	if amount <= 0 {
		return nil, errors.New("valor deve ser maior que zero")
	}
	expense := &models.RaceEntryExpense{
		RaceEntryID: entryID,
		Description: description,
		Amount:      amount,
	}
	if err := s.Repo.CreateRaceEntryExpense(expense); err != nil {
		return nil, err
	}
	return expense, nil
}

func (s *RaceService) RemoveEntryExpense(expenseID uint) error {
	return s.Repo.DeleteRaceEntryExpense(expenseID)
}

func (s *RaceService) AddEntryReimbursement(entryID uint, description string, amount models.Money) (*models.RaceEntryReimbursement, error) {
	description = strings.TrimSpace(description)
	if description == "" {
		return nil, errors.New("descrição é obrigatória")
	}
	if amount <= 0 {
		return nil, errors.New("valor deve ser maior que zero")
	}
	reimbursement := &models.RaceEntryReimbursement{
		RaceEntryID: entryID,
		Description: description,
		Amount:      amount,
	}
	if err := s.Repo.CreateRaceEntryReimbursement(reimbursement); err != nil {
		return nil, err
	}
	return reimbursement, nil
}

func (s *RaceService) RemoveEntryReimbursement(reimbursementID uint) error {
	return s.Repo.DeleteRaceEntryReimbursement(reimbursementID)
}

// ─── Race Agenda ──────────────────────────────────────────────────────────────

func (s *RaceService) GetAgenda(raceWeekendID uint) (*models.RaceAgenda, error) {
	return s.Repo.FindOrCreateAgenda(raceWeekendID)
}

func (s *RaceService) SetAgendaSaldo(raceWeekendID uint, saldo models.Money) (*models.RaceAgenda, error) {
	if saldo < 0 {
		return nil, errors.New("saldo não pode ser negativo")
	}
	return s.Repo.UpdateAgendaSaldo(raceWeekendID, saldo)
}

func (s *RaceService) AddAgendaExpense(raceWeekendID uint, description string, amount models.Money) (*models.RaceAgenda, error) {
	description = strings.TrimSpace(description)
	if description == "" {
		return nil, errors.New("descrição é obrigatória")
	}
	if amount <= 0 {
		return nil, errors.New("valor deve ser maior que zero")
	}
	return s.Repo.CreateAgendaExpense(raceWeekendID, description, amount)
}

func (s *RaceService) DeleteAgendaExpense(expenseID uint) error {
	return s.Repo.DeleteAgendaExpense(expenseID)
}

func (s *RaceService) MarkEntryAsPaid(entryID uint) (*models.RaceEntry, error) {
	entry, err := s.Repo.FindRaceEntryByID(entryID)
	if err != nil {
		return nil, errors.New("entrada não encontrada")
	}
	now := time.Now()
	if entry.Status == models.RaceStatusPago {
		return entry, nil
	}
	entry.Status = models.RaceStatusPago
	entry.PaymentDate = &now
	if err := s.Repo.UpdateRaceEntry(entry); err != nil {
		return nil, err
	}
	return entry, nil
}
