package jobs

import (
	"errors"
	"fmt"
	"log"
	"time"

	closingdomain "kartfinance-api/domain/closing"
	"kartfinance-api/models"
	"kartfinance-api/repository"
	"kartfinance-api/services"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

// BrazilLocation returns the business timezone used by financial schedules.
func BrazilLocation() *time.Location {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		// Brazil currently has no daylight-saving transition. This fallback
		// keeps the job usable in minimal images without timezone data.
		loc = time.FixedZone("BRT", -3*60*60)
	}
	return loc
}

// InitCron reconciles missed work at startup and then retries every hour. The
// startup run is essential on platforms that suspend the API while it is idle.
func InitCron(repo *repository.AppRepository) {
	runAndLog := func(trigger string) {
		log.Printf("[CRON] Iniciando reconciliação financeira (%s)...", trigger)
		if err := RunDailyJobs(repo); err != nil {
			log.Printf("[CRON] Reconciliação financeira falhou (%s): %v", trigger, err)
		}
	}

	runAndLog("startup")

	c := cron.New(cron.WithLocation(BrazilLocation()))
	if _, err := c.AddFunc("0 * * * *", func() { runAndLog("agendada") }); err != nil {
		log.Fatalf("[CRON] Falha ao inicializar cron: %v", err)
	}
	c.Start()
	log.Println("[CRON] Serviço de reconciliação iniciado (a cada hora; fuso: America/Sao_Paulo)")
}

// RunDailyJobs uses a PostgreSQL transaction-level advisory lock. Multiple API
// instances may schedule the job, but only one can execute it at a time.
func RunDailyJobs(repo *repository.AppRepository) error {
	return runDailyJobsAt(repo, time.Now())
}

func runDailyJobsAt(repo *repository.AppRepository, now time.Time) error {
	return repo.DB.Transaction(func(tx *gorm.DB) error {
		var acquired bool
		if err := tx.Raw("SELECT pg_try_advisory_xact_lock(?)", int64(723_051_001)).Scan(&acquired).Error; err != nil {
			return fmt.Errorf("acquire daily jobs lock: %w", err)
		}
		if !acquired {
			log.Println("[CRON] Outra instância já está executando os jobs financeiros")
			return nil
		}

		if err := tx.Where("expires_at <= ?", now.UTC()).Delete(&models.AdminSession{}).Error; err != nil {
			return fmt.Errorf("delete expired sessions: %w", err)
		}

		txRepo := repository.NewRepository(tx)
		txClosingService := services.NewClosingService(txRepo)
		if err := runAutoClosing(txRepo, txClosingService, now); err != nil {
			return err
		}
		if err := runOverdueUpdate(txRepo, now); err != nil {
			return err
		}
		if err := runRaceOverdueUpdate(txRepo, now); err != nil {
			return err
		}
		return nil
	})
}

func runOverdueUpdate(repo *repository.AppRepository, now time.Time) error {
	result := repo.DB.Model(&models.ClosingHistory{}).
		Where("status = ? AND due_date < ?", models.StatusPendente, now.UTC()).
		Update("status", models.StatusAtrasado)
	if result.Error != nil {
		return fmt.Errorf("update overdue closings: %w", result.Error)
	}
	if result.RowsAffected > 0 {
		log.Printf("[CRON] %d fechamento(s) marcado(s) como ATRASADO", result.RowsAffected)
	}
	return nil
}

func runRaceOverdueUpdate(repo *repository.AppRepository, now time.Time) error {
	result := repo.DB.Table("race_entries").
		Where("status = ? AND due_date < ?", models.RaceStatusPendente, now.UTC()).
		Update("status", models.RaceStatusAtrasado)
	if result.Error != nil {
		return fmt.Errorf("update overdue race entries: %w", result.Error)
	}
	if result.RowsAffected > 0 {
		log.Printf("[CRON] %d corrida(s) marcada(s) como ATRASADO", result.RowsAffected)
	}
	return nil
}

func runAutoClosing(repo *repository.AppRepository, closingService *services.ClosingService, now time.Time) error {
	var pilots []models.Pilot
	if err := repo.DB.Preload("ClosingHistories").Find(&pilots).Error; err != nil {
		return fmt.Errorf("list pilots for automatic closing: %w", err)
	}

	for _, pilot := range pilots {
		for _, period := range pendingPeriods(pilot, now) {
			log.Printf("[CRON] Realizando fechamento %s do piloto %d (%s)...", period.Reference(), pilot.ID, pilot.Name)
			_, err := closingService.FinalizeScheduledClosing(
				pilot.ID,
				period.Year,
				int(period.Month),
				period.ClosingAt,
			)
			if errors.Is(err, services.ErrClosingAlreadyExists) {
				continue
			}
			if err != nil {
				return fmt.Errorf("close pilot %d period %s: %w", pilot.ID, period.Reference(), err)
			}
			log.Printf("[CRON] Fechamento %s do piloto %d concluído", period.Reference(), pilot.ID)
		}
	}
	return nil
}

func pendingPeriods(pilot models.Pilot, now time.Time) []closingdomain.Period {
	existing := make(map[string]struct{}, len(pilot.ClosingHistories))
	for _, history := range pilot.ClosingHistories {
		existing[history.MonthReference] = struct{}{}
	}

	due := closingdomain.DuePeriods(pilot.CreatedAt, pilot.ClosingDay, now, BrazilLocation())
	pending := make([]closingdomain.Period, 0, len(due))
	for _, period := range due {
		if _, found := existing[period.Reference()]; !found {
			pending = append(pending, period)
		}
	}
	return pending
}
