package repository
import "gorm.io/gorm"

type AppRepository struct {
		DB *gorm.DB
}

func NewAppRepository(db *gorm.DB) *AppRepository {
	return &AppRepository{DB: db}
}