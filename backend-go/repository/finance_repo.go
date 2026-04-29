package repository

import (
	"time"
	"kartfinance/backend-go/models"
)

func (r *AppRepository) FindExpensesByPilotAndDate(pilotId uint, start, end time.Time) ([]models.Expense, error) {
	var expenses []models.Expense
	result := r.DB.Where("pilot_id = ? AND created_at BETWEEN ? AND ?", pilotId, start, end).Find(&expenses)
	return expenses, result.Error
}

func (r *AppRepository) FindReimbursementsByPilotAndDate(pilotId uint, start, end time.Time) ([]models.Reimbursement, error) {
	var reimbursements []models.Reimbursement
	result := r.DB.Where("pilot_id = ? AND created_at BETWEEN ? AND ?", pilotId, start, end).Find(&reimbursements)
	return reimbursements, result.Error
}

func (r *AppRepository) FindClosingHistoriesDesc(pilotId uint) ([]models.ClosingHistory, error) {
	var histories []models.ClosingHistory
	result := r.DB.Where("pilot_id = ?", pilotId).Order("month_reference desc").Find(&histories)
	return histories, result.Error
}

func (r *AppRepository) FindHistoriesNotStatus(pilotId uint, status models.ClosingStatus) ([]models.ClosingHistory, error) {
	var histories []models.ClosingHistory
	result := r.DB.Where("pilot_id = ? AND status != ?", pilotId, status).Find(&histories)
	return histories, result.Error
}

func (r *AppRepository) ExistsHistoryByPilotAndMonth(pilotId uint, monthRef string) (bool, error) {
	var count int64
	result := r.DB.Model(&models.ClosingHistory{}).
		Where("pilot_id = ? AND month_reference = ?", pilotId, monthRef).
		Count(&count)

	return count > 0, result.Error
}