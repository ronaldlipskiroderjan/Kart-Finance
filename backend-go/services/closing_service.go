package services

import (
	"fmt"
	"time"

	"kartfinance-api/dtos"
	"kartfinance-api/models"
	"kartfinance-api/repository"
)

type ClosingService struct {
	Repo *repository.AppRepository
}

func NewClosingService(repo *repository.AppRepository) *ClosingService {
	return &ClosingService{Repo: repo}
}

func (s *ClosingService) GenerateMonthlySummary(pilotID uint, year int, month int) (*dtos.ClosingSummaryDTO, error) {
	
	var pilot models.Pilot
	if err := s.Repo.DB.First(&pilot, pilotID).Error; err != nil {
		return nil, err
	}

	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0).Add(-time.Nanosecond)

	expenses, _ := s.Repo.FindExpensesByPilotAndDate(pilotID, start, end)
	reimbursements, _ := s.Repo.FindReimbursementsByPilotAndDate(pilotID, start, end)

	var totalExpenses, totalReimbursements float64
	for _, e := range expenses {
		totalExpenses += e.Amount
	}

	for _, r := range reimbursements {
		totalReimbursements += r.Amount
	}

	totalAmount := pilot.BaseFee + totalExpenses - totalReimbursements

	return &dtos.ClosingSummaryDTO{
		PilotName:           pilot.Name,
		BaseFee:             pilot.BaseFee,
		TotalExpenses:       totalExpenses,
		TotalReimbursements: totalReimbursements,
		TotalAmount:         totalAmount,
		Year:                year,
		Month:               month,
	}, nil
}

func (s *ClosingService) FinalizeClosing(pilotID uint, year int, month int) (*models.ClosingHistory, error) {
	summary, err := s.GenerateMonthlySummary(pilotID, year, month)
	if err != nil {
		return nil, err
	}

	history := models.ClosingHistory{
		PilotID:             pilotID,
		MonthReference:      fmt.Sprintf("%d/%02d", year, month),
		TotalAmount:         summary.TotalAmount,
		BaseFee:             summary.BaseFee,
		TotalExpenses:       summary.TotalExpenses,
		TotalReimbursements: summary.TotalReimbursements,
		Status:              models.StatusPendente,
		DueDate:             time.Now().AddDate(0, 0, 7),
	}

	if err := s.Repo.DB.Create(&history).Error; err != nil {
		return nil, err
	}

	return &history, nil
}

func (s *ClosingService) GetPilotHistory(pilotID uint) ([]models.ClosingHistory, error) {
	return s.Repo.FindClosingHistoriesDesc(pilotID)
}

func (s *ClosingService) MarkAsPaid(closingID uint) error {
	var history models.ClosingHistory

	if err := s.Repo.DB.First(&history, closingID).Error; err != nil {
		return err
	}

	now := time.Now()

	if err := s.Repo.DB.Model(&history).Updates(models.ClosingHistory{
		Status:      models.StatusPago,
		PaymentDate: &now,
	}).Error; err != nil {
		return err
	}

	// Atualiza o dia do fechamento (ClosingDay) do piloto para o dia do pagamento atual
	return s.Repo.DB.Model(&models.Pilot{}).
		Where("id = ?", history.PilotID).
		Update("closing_day", now.Day()).Error
}