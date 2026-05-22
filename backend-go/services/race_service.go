package services

import (
	"errors"
	"kartfinance-api/models"
	"kartfinance-api/repository"
	"time"
)

type RaceService struct {
	Repo *repository.AppRepository
}

func NewRaceService(repo *repository.AppRepository) *RaceService {
	return &RaceService{Repo: repo}
}

func (s *RaceService) CreateRaceWeekend(name, description string, date time.Time) (*models.RaceWeekend, error) {
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
	race, err := s.Repo.FindRaceWeekendByID(id)
	if err != nil {
		return nil, errors.New("fim de semana não encontrado")
	}
	race.Name = name
	race.Description = description
	race.Date = date
	if err := s.Repo.UpdateRaceWeekend(race); err != nil {
		return nil, err
	}
	return race, nil
}

func (s *RaceService) DeleteRaceWeekend(id uint) error {
	return s.Repo.DeleteRaceWeekend(id)
}

func (s *RaceService) AddPilotToRace(raceWeekendID, pilotID uint, amount float64) (*models.RaceEntry, error) {
	exists, err := s.Repo.ExistsRaceEntryForPilot(raceWeekendID, pilotID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("piloto já adicionado a este fim de semana")
	}

	entry := &models.RaceEntry{
		RaceWeekendID: raceWeekendID,
		PilotID:       pilotID,
		Amount:        amount,
		Status:        models.RaceStatusPendente,
		DueDate:       time.Now().AddDate(0, 0, 7),
	}
	if err := s.Repo.CreateRaceEntry(entry); err != nil {
		return nil, err
	}

	return s.Repo.FindRaceEntryByID(entry.ID)
}

func (s *RaceService) UpdateRaceEntry(entryID uint, amount float64) (*models.RaceEntry, error) {
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

func (s *RaceService) AddEntryExpense(entryID uint, description string, amount float64) (*models.RaceEntryExpense, error) {
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

func (s *RaceService) MarkEntryAsPaid(entryID uint) (*models.RaceEntry, error) {
	entry, err := s.Repo.FindRaceEntryByID(entryID)
	if err != nil {
		return nil, errors.New("entrada não encontrada")
	}
	now := time.Now()
	entry.Status = models.RaceStatusPago
	entry.PaymentDate = &now
	if err := s.Repo.UpdateRaceEntry(entry); err != nil {
		return nil, err
	}
	return entry, nil
}
