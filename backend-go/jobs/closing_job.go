package jobs

import (
	"log"
	"time"

	"kartfinance-api/models"
	"kartfinance-api/repository"
	"kartfinance-api/services"

	"github.com/robfig/cron/v3"
)

func InitCron(repo *repository.AppRepository, closingService *services.ClosingService) {
	// Cria um novo agendador (cron)
	c := cron.New()

	// Agendado para rodar todo dia à meia-noite
	_, err := c.AddFunc("0 0 * * *", func() {
		log.Println("[CRON] Iniciando fechamento automático...")
		runAutoClosing(repo, closingService)
	})

	if err != nil {
		log.Fatalf("[CRON] Falha ao inicializar cron: %v", err)
	}

	c.Start()
	log.Println("[CRON] Serviço de agendamento (Cron) iniciado com sucesso")
}

func runAutoClosing(repo *repository.AppRepository, closingService *services.ClosingService) {
	now := time.Now()
	currentDay := now.Day()

	// Verifica se hoje é o último dia do mês atual
	tomorrow := now.AddDate(0, 0, 1)
	isLastDayOfMonth := tomorrow.Day() == 1

	var pilots []models.Pilot

	if isLastDayOfMonth {
		// Se for o último dia do mês, pega todos que tem fechamento hoje ou em dias que não existem neste mês
		// Ex: Mês acaba dia 28, pega pilotos com vencimento 28, 29, 30, 31
		repo.DB.Where("closing_day >= ?", currentDay).Find(&pilots)
	} else {
		// Senão, pega apenas os pilotos com fechamento exatamente para hoje
		repo.DB.Where("closing_day = ?", currentDay).Find(&pilots)
	}

	for _, pilot := range pilots {
		// Verifica se o piloto já tem fechamento para este mês para evitar duplicatas
		var existingCount int64
		monthRef := now.Format("2006/01") // yyyy/mm
		repo.DB.Model(&models.ClosingHistory{}).
			Where("pilot_id = ? AND month_reference = ?", pilot.ID, monthRef).
			Count(&existingCount)

		if existingCount > 0 {
			log.Printf("[CRON] Piloto %d (%s) já possui fechamento para %s. Pulando...", pilot.ID, pilot.Name, monthRef)
			continue
		}

		log.Printf("[CRON] Realizando fechamento do piloto %d (%s)...", pilot.ID, pilot.Name)
		_, err := closingService.FinalizeClosing(pilot.ID, now.Year(), int(now.Month()))
		if err != nil {
			log.Printf("[CRON] Erro ao fechar piloto %d: %v", pilot.ID, err)
		} else {
			log.Printf("[CRON] Piloto %d fechado com sucesso", pilot.ID)
		}
	}
}
