package repository

import "kartfinance-api/models"

func (r *AppRepository) FindExpenseByPilotAndDate(pilotId uint, start, end time.Time) ([]models.Expense, error) {
		var expenses []models.Expense
		result := r.DB.Where("pilot_id = ? AND created_at BETWEEN ? AND ?", pilotId, start, end).Find(&expenses)
		return expenses, result.Error
}	