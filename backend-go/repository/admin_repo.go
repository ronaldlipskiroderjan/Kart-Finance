package repository
import (
	"errors"
	"kartfinance-api/models"
	"gorm.io/gorm"
)

func (r *AppRepository) FindAdminByEmail(email string) (*models.Admin, error) {
	var admin models.Admin
	result := r.DB.Where("email = ?", email).First(&admin)

	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &admin, result.Error
}