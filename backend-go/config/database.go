package config 

import (
	"log"
	"os"
	"kartfinance-api/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}

	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	err = database.AutoMigrate(
		&models.Admin{}, 
		&models.Pilot{},
		&models.Expense{},
		&models.Reimbursement{},
		&models.ClosingHistory{},
	)

	if err != nil {
		log.Fatal("Failed to migrate database: ", err)
	}

	log.Println("Database connection established and migrated successfully")
	DB = database

}