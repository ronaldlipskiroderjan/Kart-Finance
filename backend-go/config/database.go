package config

import (
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}

	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	// Tabelas existentes já estão no banco — pula AutoMigrate para evitar conflito com views
	// Cria as tabelas de corrida via SQL direto, sem tocar nas tabelas existentes
	sqlRaceWeekends := `
		CREATE TABLE IF NOT EXISTS race_weekends (
			id          BIGSERIAL PRIMARY KEY,
			name        CHARACTER VARYING(255) NOT NULL,
			date        TIMESTAMPTZ NOT NULL,
			description TEXT,
			created_at  TIMESTAMPTZ DEFAULT NOW()
		)`

	sqlRaceEntries := `
		CREATE TABLE IF NOT EXISTS race_entries (
			id               BIGSERIAL PRIMARY KEY,
			race_weekend_id  BIGINT NOT NULL REFERENCES race_weekends(id),
			pilot_id         BIGINT NOT NULL REFERENCES pilots(id),
			amount           DOUBLE PRECISION NOT NULL,
			status           CHARACTER VARYING(20) NOT NULL DEFAULT 'PENDENTE',
			due_date         TIMESTAMPTZ,
			payment_date     TIMESTAMPTZ,
			created_at       TIMESTAMPTZ DEFAULT NOW()
		)`

	if err := database.Exec(sqlRaceWeekends).Error; err != nil {
		log.Fatal("Failed to create race_weekends table: ", err)
	}
	if err := database.Exec(sqlRaceEntries).Error; err != nil {
		log.Fatal("Failed to create race_entries table: ", err)
	}

	// Adiciona colunas novas caso a tabela já exista sem elas
	database.Exec(`ALTER TABLE race_entries ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ`)

	sqlRaceEntryExpenses := `
		CREATE TABLE IF NOT EXISTS race_entry_expenses (
			id             BIGSERIAL PRIMARY KEY,
			race_entry_id  BIGINT NOT NULL REFERENCES race_entries(id),
			description    CHARACTER VARYING(255) NOT NULL,
			amount         DOUBLE PRECISION NOT NULL,
			created_at     TIMESTAMPTZ DEFAULT NOW()
		)`
	if err := database.Exec(sqlRaceEntryExpenses).Error; err != nil {
		log.Fatal("Failed to create race_entry_expenses table: ", err)
	}

	log.Println("Database connection established and migrated successfully")
	DB = database
}
