package repository

import "gorm.io/gorm"


type AppRepository struct {
		DB *gorm.DB
}

func NewRepository(db *gorm.DB) *AppRepository {
	return &AppRepository{DB: db}
}