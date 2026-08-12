package main

import (
	"log"
	"os"
	"strings"

	"kartfinance-api/config"
	"kartfinance-api/internal/auth"
	"kartfinance-api/models"
)

func main() {
	name := strings.TrimSpace(os.Getenv("ADMIN_NAME"))
	email := strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))
	password := os.Getenv("ADMIN_PASSWORD")
	if name == "" || email == "" || password == "" {
		log.Fatal("ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required")
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatal(err)
	}
	database, err := config.OpenDatabase(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}

	admin := models.Admin{Name: name, Email: email, Password: hash, Role: "admin"}
	if err := database.Create(&admin).Error; err != nil {
		log.Fatal(err)
	}
	log.Printf("administrator %s created", email)
}
