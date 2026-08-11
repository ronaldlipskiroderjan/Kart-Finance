package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"kartfinance-api/models"
	"kartfinance-api/repository"

	"gorm.io/gorm"
)

type FinanceService struct {
	Repo *repository.AppRepository
}

type FinancialEntryInput struct {
	Description string
	Amount      models.Money
	Period      string
}

func NewFinanceService(repo *repository.AppRepository) *FinanceService {
	return &FinanceService{Repo: repo}
}

func (s *FinanceService) ListExpenses(pilotID uint, period string) ([]models.Expense, error) {
	query := s.Repo.DB.Where("pilot_id = ?", pilotID).Order("reference_period DESC, created_at DESC")
	if period != "" {
		start, end, err := periodRange(period)
		if err != nil {
			return nil, err
		}
		query = query.Where("reference_period >= ? AND reference_period < ?", start, end)
	}
	var entries []models.Expense
	if err := query.Find(&entries).Error; err != nil {
		return nil, err
	}
	return entries, nil
}

func (s *FinanceService) CreateExpense(pilotID uint, input FinancialEntryInput) (*models.Expense, error) {
	period, err := validateFinancialEntry(input)
	if err != nil {
		return nil, err
	}
	if err := ensurePilot(s.Repo.DB, pilotID); err != nil {
		return nil, err
	}
	entry := &models.Expense{PilotID: pilotID, Description: strings.TrimSpace(input.Description), Amount: input.Amount, ReferencePeriod: period}
	if err := s.Repo.DB.Create(entry).Error; err != nil {
		return nil, err
	}
	return entry, nil
}

func (s *FinanceService) DeleteExpense(id uint) error {
	return deleteByID(s.Repo.DB, &models.Expense{}, id)
}

func (s *FinanceService) ListReimbursements(pilotID uint, period string) ([]models.Reimbursement, error) {
	query := s.Repo.DB.Where("pilot_id = ?", pilotID).Order("reference_period DESC, created_at DESC")
	if period != "" {
		start, end, err := periodRange(period)
		if err != nil {
			return nil, err
		}
		query = query.Where("reference_period >= ? AND reference_period < ?", start, end)
	}
	var entries []models.Reimbursement
	if err := query.Find(&entries).Error; err != nil {
		return nil, err
	}
	return entries, nil
}

func (s *FinanceService) CreateReimbursement(pilotID uint, input FinancialEntryInput) (*models.Reimbursement, error) {
	period, err := validateFinancialEntry(input)
	if err != nil {
		return nil, err
	}
	if err := ensurePilot(s.Repo.DB, pilotID); err != nil {
		return nil, err
	}
	entry := &models.Reimbursement{PilotID: pilotID, Description: strings.TrimSpace(input.Description), Amount: input.Amount, ReferencePeriod: period}
	if err := s.Repo.DB.Create(entry).Error; err != nil {
		return nil, err
	}
	return entry, nil
}

func (s *FinanceService) DeleteReimbursement(id uint) error {
	return deleteByID(s.Repo.DB, &models.Reimbursement{}, id)
}

func validateFinancialEntry(input FinancialEntryInput) (time.Time, error) {
	if strings.TrimSpace(input.Description) == "" {
		return time.Time{}, errors.New("descrição é obrigatória")
	}
	if input.Amount <= 0 {
		return time.Time{}, errors.New("valor deve ser maior que zero")
	}
	period, _, err := periodRange(input.Period)
	return period, err
}

func periodRange(period string) (time.Time, time.Time, error) {
	parsed, err := time.Parse("2006-01", period)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("período deve usar o formato AAAA-MM")
	}
	start := time.Date(parsed.Year(), parsed.Month(), 1, 0, 0, 0, 0, time.UTC)
	return start, start.AddDate(0, 1, 0), nil
}

func ensurePilot(database *gorm.DB, pilotID uint) error {
	var count int64
	if err := database.Model(&models.Pilot{}).Where("id = ?", pilotID).Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func deleteByID(database *gorm.DB, model any, id uint) error {
	result := database.Delete(model, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
