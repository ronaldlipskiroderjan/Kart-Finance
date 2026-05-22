package repository

import "kartfinance-api/models"

func (r *AppRepository) CreateRaceWeekend(race *models.RaceWeekend) error {
	return r.DB.Create(race).Error
}

func (r *AppRepository) FindAllRaceWeekends() ([]models.RaceWeekend, error) {
	var races []models.RaceWeekend
	err := r.DB.Preload("Entries.Pilot").Preload("Entries.Extras").Order("date desc").Find(&races).Error
	return races, err
}

func (r *AppRepository) FindRaceWeekendByID(id uint) (*models.RaceWeekend, error) {
	var race models.RaceWeekend
	err := r.DB.Preload("Entries.Pilot").Preload("Entries.Extras").First(&race, id).Error
	return &race, err
}

func (r *AppRepository) UpdateRaceWeekend(race *models.RaceWeekend) error {
	return r.DB.Save(race).Error
}

func (r *AppRepository) DeleteRaceWeekend(id uint) error {
	// Remove expenses first (FK: race_entry_expenses → race_entries)
	r.DB.Exec(
		`DELETE FROM race_entry_expenses WHERE race_entry_id IN (SELECT id FROM race_entries WHERE race_weekend_id = ?)`,
		id,
	)
	if err := r.DB.Where("race_weekend_id = ?", id).Delete(&models.RaceEntry{}).Error; err != nil {
		return err
	}
	return r.DB.Delete(&models.RaceWeekend{}, id).Error
}

func (r *AppRepository) CreateRaceEntry(entry *models.RaceEntry) error {
	return r.DB.Create(entry).Error
}

func (r *AppRepository) FindRaceEntryByID(id uint) (*models.RaceEntry, error) {
	var entry models.RaceEntry
	err := r.DB.Preload("Pilot").First(&entry, id).Error
	return &entry, err
}

func (r *AppRepository) UpdateRaceEntry(entry *models.RaceEntry) error {
	return r.DB.Save(entry).Error
}

func (r *AppRepository) DeleteRaceEntry(id uint) error {
	r.DB.Where("race_entry_id = ?", id).Delete(&models.RaceEntryExpense{})
	return r.DB.Delete(&models.RaceEntry{}, id).Error
}

func (r *AppRepository) FindRaceEntriesByPilotID(pilotID uint) ([]models.RaceEntry, error) {
	var entries []models.RaceEntry
	err := r.DB.Preload("RaceWeekend").Preload("Extras").
		Where("pilot_id = ?", pilotID).
		Order("created_at desc").
		Find(&entries).Error
	return entries, err
}

func (r *AppRepository) CreateRaceEntryExpense(expense *models.RaceEntryExpense) error {
	return r.DB.Create(expense).Error
}

func (r *AppRepository) DeleteRaceEntryExpense(id uint) error {
	return r.DB.Delete(&models.RaceEntryExpense{}, id).Error
}

func (r *AppRepository) ExistsRaceEntryForPilot(raceWeekendID, pilotID uint) (bool, error) {
	var count int64
	err := r.DB.Model(&models.RaceEntry{}).
		Where("race_weekend_id = ? AND pilot_id = ?", raceWeekendID, pilotID).
		Count(&count).Error
	return count > 0, err
}
