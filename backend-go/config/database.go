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
			race_weekend_id  BIGINT NOT NULL REFERENCES race_weekends(id) ON DELETE CASCADE,
			pilot_id         BIGINT NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
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
			race_entry_id  BIGINT NOT NULL REFERENCES race_entries(id) ON DELETE CASCADE,
			description    CHARACTER VARYING(255) NOT NULL,
			amount         DOUBLE PRECISION NOT NULL,
			created_at     TIMESTAMPTZ DEFAULT NOW()
		)`
	if err := database.Exec(sqlRaceEntryExpenses).Error; err != nil {
		log.Fatal("Failed to create race_entry_expenses table: ", err)
	}

	// Garante ON DELETE CASCADE nas FKs para pilotos e corridas — necessário para DELETE de piloto funcionar
	database.Exec(`
		DO $$
		BEGIN
			-- race_entries.pilot_id → pilots.id
			IF EXISTS (
				SELECT 1 FROM information_schema.table_constraints
				WHERE constraint_name = 'race_entries_pilot_id_fkey'
			) THEN
				ALTER TABLE race_entries DROP CONSTRAINT race_entries_pilot_id_fkey;
			END IF;
			ALTER TABLE race_entries
				ADD CONSTRAINT race_entries_pilot_id_fkey
				FOREIGN KEY (pilot_id) REFERENCES pilots(id) ON DELETE CASCADE;

			-- race_entry_expenses.race_entry_id → race_entries.id
			IF EXISTS (
				SELECT 1 FROM information_schema.table_constraints
				WHERE constraint_name = 'race_entry_expenses_race_entry_id_fkey'
			) THEN
				ALTER TABLE race_entry_expenses DROP CONSTRAINT race_entry_expenses_race_entry_id_fkey;
			END IF;
			ALTER TABLE race_entry_expenses
				ADD CONSTRAINT race_entry_expenses_race_entry_id_fkey
				FOREIGN KEY (race_entry_id) REFERENCES race_entries(id) ON DELETE CASCADE;
		END
		$$;
	`)

	log.Println("Database connection established and migrated successfully")
	DB = database
}
