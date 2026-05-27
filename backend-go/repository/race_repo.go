package repository

import "kartfinance-api/models"

func (r *AppRepository) CreateRaceWeekend(race *models.RaceWeekend) error {
	return r.DB.Create(race).Error
}

func (r *AppRepository) FindAllRaceWeekends() ([]models.RaceWeekend, error) {
	var races []models.RaceWeekend
	err := r.DB.
		Preload("Entries.Pilot").
		Preload("Entries.GuestPilot").
		Preload("Entries.Extras").
		Preload("Entries.Reimbursements").
		Order("date desc").Find(&races).Error
	return races, err
}

func (r *AppRepository) FindRaceWeekendByID(id uint) (*models.RaceWeekend, error) {
	var race models.RaceWeekend
	err := r.DB.
		Preload("Entries.Pilot").
		Preload("Entries.GuestPilot").
		Preload("Entries.Extras").
		Preload("Entries.Reimbursements").
		First(&race, id).Error
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
	err := r.DB.Preload("Pilot").Preload("GuestPilot").First(&entry, id).Error
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
	err := r.DB.Preload("RaceWeekend").Preload("Extras").Preload("Reimbursements").
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

func (r *AppRepository) CreateRaceEntryReimbursement(reimbursement *models.RaceEntryReimbursement) error {
	return r.DB.Create(reimbursement).Error
}

func (r *AppRepository) DeleteRaceEntryReimbursement(id uint) error {
	return r.DB.Delete(&models.RaceEntryReimbursement{}, id).Error
}

func (r *AppRepository) ExistsRaceEntryForPilot(raceWeekendID, pilotID uint) (bool, error) {
	var count int64
	err := r.DB.Model(&models.RaceEntry{}).
		Where("race_weekend_id = ? AND pilot_id = ?", raceWeekendID, pilotID).
		Count(&count).Error
	return count > 0, err
}

func (r *AppRepository) ExistsRaceEntryForGuestPilot(raceWeekendID, guestPilotID uint) (bool, error) {
	var count int64
	err := r.DB.Model(&models.RaceEntry{}).
		Where("race_weekend_id = ? AND guest_pilot_id = ?", raceWeekendID, guestPilotID).
		Count(&count).Error
	return count > 0, err
}

// ─── Guest Pilots ─────────────────────────────────────────────────────────────

func (r *AppRepository) FindAllGuestPilots() ([]models.GuestPilot, error) {
	var guests []models.GuestPilot
	err := r.DB.Order("name asc").Find(&guests).Error
	return guests, err
}

// FindOrCreateGuestPilot busca um piloto convidado pelo nome (case-insensitive).
// Se não existir, cria um novo registro e retorna.
func (r *AppRepository) FindOrCreateGuestPilot(name string) (*models.GuestPilot, error) {
	var guest models.GuestPilot
	err := r.DB.Where("LOWER(name) = LOWER(?)", name).First(&guest).Error
	if err != nil {
		guest = models.GuestPilot{Name: name}
		if createErr := r.DB.Create(&guest).Error; createErr != nil {
			return nil, createErr
		}
	}
	return &guest, nil
}

// ─── Race Agenda ──────────────────────────────────────────────────────────────

// FindOrCreateAgenda retorna a agenda de um fim de semana, criando-a se não existir.
func (r *AppRepository) FindOrCreateAgenda(raceWeekendID uint) (*models.RaceAgenda, error) {
	var agenda models.RaceAgenda
	err := r.DB.Preload("Expenses").Where("race_weekend_id = ?", raceWeekendID).First(&agenda).Error
	if err != nil {
		// Não existe — cria zerada
		agenda = models.RaceAgenda{RaceWeekendID: raceWeekendID, Saldo: 0}
		if createErr := r.DB.Create(&agenda).Error; createErr != nil {
			return nil, createErr
		}
		agenda.Expenses = []models.RaceAgendaExpense{}
	}
	return &agenda, nil
}

// UpdateAgendaSaldo atualiza apenas o saldo da agenda.
func (r *AppRepository) UpdateAgendaSaldo(raceWeekendID uint, saldo float64) (*models.RaceAgenda, error) {
	agenda, err := r.FindOrCreateAgenda(raceWeekendID)
	if err != nil {
		return nil, err
	}
	agenda.Saldo = saldo
	if err := r.DB.Save(agenda).Error; err != nil {
		return nil, err
	}
	// Recarrega com expenses
	return r.FindOrCreateAgenda(raceWeekendID)
}

// CreateAgendaExpense adiciona um gasto à agenda de um fim de semana.
func (r *AppRepository) CreateAgendaExpense(raceWeekendID uint, description string, amount float64) (*models.RaceAgenda, error) {
	agenda, err := r.FindOrCreateAgenda(raceWeekendID)
	if err != nil {
		return nil, err
	}
	expense := models.RaceAgendaExpense{
		RaceAgendaID: agenda.ID,
		Description:  description,
		Amount:       amount,
	}
	if err := r.DB.Create(&expense).Error; err != nil {
		return nil, err
	}
	return r.FindOrCreateAgenda(raceWeekendID)
}

// DeleteAgendaExpense remove um gasto pelo ID.
func (r *AppRepository) DeleteAgendaExpense(expenseID uint) error {
	return r.DB.Delete(&models.RaceAgendaExpense{}, expenseID).Error
}
