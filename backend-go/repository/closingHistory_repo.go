package repository

import "kartfinance-api/models"

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