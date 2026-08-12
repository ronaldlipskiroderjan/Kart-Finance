package services

import (
	"errors"
	"fmt"
	"time"

	"kartfinance-api/domain/billing"
	"kartfinance-api/dtos"
	"kartfinance-api/models"
	"kartfinance-api/repository"

	"gorm.io/gorm"
)

var ErrClosingAlreadyExists = errors.New("o período já foi fechado para este piloto")

type ClosingService struct {
	Repo *repository.AppRepository
}

func NewClosingService(repo *repository.AppRepository) *ClosingService {
	return &ClosingService{Repo: repo}
}

func (s *ClosingService) GenerateMonthlySummary(pilotID uint, year int, month int) (*dtos.ClosingSummaryDTO, error) {
	if year < 2000 || year > 2200 || month < 1 || month > 12 {
		return nil, fmt.Errorf("período contábil inválido")
	}

	var pilot models.Pilot
	if err := s.Repo.DB.First(&pilot, pilotID).Error; err != nil {
		return nil, err
	}

	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)
	expenses, err := s.Repo.FindExpensesByPilotAndDate(pilotID, start, end)
	if err != nil {
		return nil, err
	}
	reimbursements, err := s.Repo.FindReimbursementsByPilotAndDate(pilotID, start, end)
	if err != nil {
		return nil, err
	}

	expenseAmounts := make([]models.Money, 0, len(expenses))
	for _, entry := range expenses {
		expenseAmounts = append(expenseAmounts, entry.Amount)
	}
	reimbursementAmounts := make([]models.Money, 0, len(reimbursements))
	for _, entry := range reimbursements {
		reimbursementAmounts = append(reimbursementAmounts, entry.Amount)
	}

	var overdueClosings []models.ClosingHistory
	if err := s.Repo.DB.Where("pilot_id = ? AND status = ?", pilotID, models.StatusAtrasado).Find(&overdueClosings).Error; err != nil {
		return nil, err
	}
	overdueAmounts := make([]models.Money, 0, len(overdueClosings))
	for _, closing := range overdueClosings {
		overdueAmounts = append(overdueAmounts, closing.TotalAmount)
	}

	calculated := billing.Calculate(pilot.BaseFee, expenseAmounts, reimbursementAmounts, overdueAmounts)
	return &dtos.ClosingSummaryDTO{
		PilotName: pilot.Name, BaseFee: calculated.BaseFee,
		TotalExpenses: calculated.TotalExpenses, TotalReimbursements: calculated.TotalReimbursements,
		TotalAmount: calculated.CurrentPeriodAmount, PreviousDebt: calculated.PreviousDebt,
		UnpaidMonthsCount: calculated.UnpaidPeriodsCount, FinalAmount: calculated.FinalAmount,
		Year: year, Month: month,
	}, nil
}

func (s *ClosingService) FinalizeClosing(pilotID uint, year int, month int) (*models.ClosingHistory, error) {
	return s.finalizeClosing(pilotID, year, month, time.Now().UTC().AddDate(0, 0, 7))
}

// FinalizeScheduledClosing preserves the original business deadline when a
// sleeping or temporarily unavailable API reconciles an overdue period.
func (s *ClosingService) FinalizeScheduledClosing(pilotID uint, year int, month int, closingAt time.Time) (*models.ClosingHistory, error) {
	return s.finalizeClosing(pilotID, year, month, closingAt.AddDate(0, 0, 7).UTC())
}

func (s *ClosingService) finalizeClosing(pilotID uint, year int, month int, dueDate time.Time) (*models.ClosingHistory, error) {
	monthRef := fmt.Sprintf("%d/%02d", year, month)
	var created models.ClosingHistory

	err := s.Repo.DB.Transaction(func(tx *gorm.DB) error {
		txRepo := repository.NewRepository(tx)
		txService := NewClosingService(txRepo)

		var count int64
		if err := tx.Model(&models.ClosingHistory{}).
			Where("pilot_id = ? AND month_reference = ?", pilotID, monthRef).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return ErrClosingAlreadyExists
		}

		summary, err := txService.GenerateMonthlySummary(pilotID, year, month)
		if err != nil {
			return err
		}
		created = models.ClosingHistory{
			PilotID: pilotID, MonthReference: monthRef, TotalAmount: summary.TotalAmount,
			BaseFee: summary.BaseFee, TotalExpenses: summary.TotalExpenses,
			TotalReimbursements: summary.TotalReimbursements, Status: models.StatusPendente,
			DueDate: dueDate,
		}
		return tx.Create(&created).Error
	})
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return nil, ErrClosingAlreadyExists
	}
	if err != nil {
		return nil, err
	}
	return &created, nil
}

func (s *ClosingService) GetPilotHistory(pilotID uint) ([]models.ClosingHistory, error) {
	return s.Repo.FindClosingHistoriesDesc(pilotID)
}

func (s *ClosingService) MarkAsPaid(closingID uint) error {
	now := time.Now().UTC()
	result := s.Repo.DB.Model(&models.ClosingHistory{}).
		Where("id = ? AND status <> ?", closingID, models.StatusPago).
		Updates(map[string]any{
			"status": models.StatusPago, "payment_date": now,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected > 0 {
		return nil
	}

	var count int64
	if err := s.Repo.DB.Model(&models.ClosingHistory{}).Where("id = ?", closingID).Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return gorm.ErrRecordNotFound
	}
	// Already paid: preserve the original payment timestamp.
	return nil
}

func (s *ClosingService) DeleteClosing(closingID uint) error {
	result := s.Repo.DB.Delete(&models.ClosingHistory{}, closingID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
