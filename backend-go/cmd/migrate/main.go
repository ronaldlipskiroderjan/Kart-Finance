package main

import (
	"log"
	"os"

	"kartfinance-api/config"
	"kartfinance-api/internal/migrations"
)

func main() {
	database, err := config.OpenDatabase(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	if err := migrations.Up(database); err != nil {
		log.Fatal(err)
	}
	log.Println("database migrations applied successfully")
}
