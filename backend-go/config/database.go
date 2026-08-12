package config

import (
	"log"
	"os"

	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	database, err := OpenDatabase(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	DB = database
	log.Println("Database connection established successfully")
}
