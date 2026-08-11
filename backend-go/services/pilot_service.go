package services

import (
	"errors"
	"fmt"
	"strings"

	"kartfinance-api/models"
	"kartfinance-api/repository"

	"gorm.io/gorm"
)

type PilotService struct {
	Repo *repository.AppRepository
}

type PilotList struct {
	Items []models.Pilot
	Total int64
	Page  int
	Size  int
}

type PilotInput struct {
	Name         string
	Category     string
	BaseFee      models.Money
	Observations string
	ClosingDay   int
}

func NewPilotService(repo *repository.AppRepository) *PilotService {
	return &PilotService{Repo: repo}
}

func (s *PilotService) List(page, size int, search string) (*PilotList, error) {
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 20
	}
	if size > 100 {
		size = 100
	}

	query := s.Repo.DB.Model(&models.Pilot{})
	if search = strings.TrimSpace(search); search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}
	var pilots []models.Pilot
	if err := query.Order("name ASC").Offset((page - 1) * size).Limit(size).Find(&pilots).Error; err != nil {
		return nil, err
	}
	return &PilotList{Items: pilots, Total: total, Page: page, Size: size}, nil
}

func (s *PilotService) Get(id uint) (*models.Pilot, error) {
	var pilot models.Pilot
	if err := s.Repo.DB.First(&pilot, id).Error; err != nil {
		return nil, err
	}
	return &pilot, nil
}

func (s *PilotService) Create(input PilotInput) (*models.Pilot, error) {
	if err := validatePilot(input); err != nil {
		return nil, err
	}
	pilot := &models.Pilot{
		Name: strings.TrimSpace(input.Name), Category: strings.TrimSpace(input.Category),
		BaseFee: input.BaseFee, Observations: strings.TrimSpace(input.Observations), ClosingDay: input.ClosingDay,
	}
	if err := s.Repo.DB.Create(pilot).Error; err != nil {
		return nil, err
	}
	return pilot, nil
}

func (s *PilotService) Update(id uint, input PilotInput) (*models.Pilot, error) {
	if err := validatePilot(input); err != nil {
		return nil, err
	}
	pilot, err := s.Get(id)
	if err != nil {
		return nil, err
	}
	updates := map[string]any{
		"name": strings.TrimSpace(input.Name), "category": strings.TrimSpace(input.Category),
		"base_fee": input.BaseFee, "observations": strings.TrimSpace(input.Observations), "closing_day": input.ClosingDay,
	}
	if err := s.Repo.DB.Model(pilot).Updates(updates).Error; err != nil {
		return nil, err
	}
	return s.Get(id)
}

func (s *PilotService) Delete(id uint) error {
	return s.Repo.DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Delete(&models.Pilot{}, id)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
}
func (s *PilotService) ListOverview() ([]models.Pilot, error) {
	var pilots []models.Pilot
	err := s.Repo.DB.
		Preload("Expenses").
		Preload("Reimbursements").
		Preload("ClosingHistories", func(db *gorm.DB) *gorm.DB { return db.Order("month_reference DESC") }).
		Order("name ASC").
		Find(&pilots).Error
	if err != nil {
		return nil, err
	}
	return pilots, nil
}

func validatePilot(input PilotInput) error {
	if strings.TrimSpace(input.Name) == "" {
		return errors.New("nome é obrigatório")
	}
	if input.BaseFee < 0 {
		return errors.New("mensalidade não pode ser negativa")
	}
	if input.ClosingDay < 1 || input.ClosingDay > 31 {
		return fmt.Errorf("dia de fechamento deve estar entre 1 e 31")
	}
	return nil
}
