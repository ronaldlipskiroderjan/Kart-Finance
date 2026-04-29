package repository

import "kartfinance-api/models"

func (r *AppRepository) FindPilotsByClosing(day int) ([]models.Pilot, error) {
	var pilots []models.Pilot
	result := r.DB.Where("closing_day = ?", day).Find(&pilots)

	return pilots, result.Error
}