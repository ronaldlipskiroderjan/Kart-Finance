package main

import (
	"log"
	"os"

	"kartfinance-api/config"
	"kartfinance-api/controllers"
	sessionauth "kartfinance-api/internal/auth"
	"kartfinance-api/internal/httpx"
	"kartfinance-api/jobs"
	"kartfinance-api/repository"
	"kartfinance-api/services"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
)

func main() {
	config.ConnectDB()
	app := fiber.New()
	config.SetupCors(app)
	repo := repository.NewRepository(config.DB)
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(logger.New())

	closingService := services.NewClosingService(repo)
	pilotService := services.NewPilotService(repo)
	financeService := services.NewFinanceService(repo)
	v1Controller := controllers.NewV1Controller(pilotService, financeService, closingService)
	sessionManager := sessionauth.NewManager(config.DB, sessionauth.ConfigFromEnv())
	jobs.InitCron(repo)
	loginLimiter := sessionauth.LoginRateLimit()

	authController := controllers.NewAuthController(repo, sessionManager)
	adminController := controllers.NewAdminController(repo)
	configController := controllers.NewConfigController(repo)
	pilotController := controllers.NewPilotController(repo)
	expenseController := controllers.NewExpenseController(repo)
	reimbursementController := controllers.NewReimbursementController(repo)
	closingController := controllers.NewClosingController(closingService)

	raceService := services.NewRaceService(repo)
	raceController := controllers.NewRaceController(raceService)

	// Rotas da API
	sessionController := controllers.NewSessionController(sessionManager)
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("API RA Kart Racing em Go está ONLINE! 🏎️💨")
	})

	//Rotas de Auth
	authGroup := app.Group("/auth")
	authGroup.Post("/login", loginLimiter, authController.Login)

	//Rotas de Configuração Global
	configGroup := app.Group("/config")
	apiV1 := app.Group("/api/v1")
	apiV1.Get("/health", func(c *fiber.Ctx) error { return c.JSON(fiber.Map{"status": "ok"}) })
	apiV1.Post("/auth/sessions", loginLimiter, authController.Login)

	// All routes registered below this point require a valid server-side session.
	app.Use(sessionManager.RequireSession)
	apiV1.Get("/me", sessionController.Me)
	apiV1.Delete("/auth/sessions/current", sessionController.Logout)

	// Versioned resource-oriented API.
	apiV1.Get("/settings", configController.GetConfig)
	apiV1.Patch("/settings", configController.UpdateConfig)
	apiV1.Get("/admins", sessionauth.RequireRole("admin", "superadmin"), adminController.GetAllAdmins)
	apiV1.Post("/admins", sessionauth.RequireRole("admin", "superadmin"), adminController.CreateAdmin)
	apiV1.Patch("/admins/:id", sessionauth.RequireRole("admin", "superadmin"), adminController.UpdateAdmin)
	apiV1.Delete("/admins/:id", sessionauth.RequireRole("admin", "superadmin"), adminController.DeleteAdmin)
	apiV1.Put("/admins/:id/password", adminController.UpdatePassword)

	apiV1.Get("/pilots", v1Controller.ListPilots)
	apiV1.Get("/pilot-overviews", v1Controller.ListPilotOverviews)
	apiV1.Get("/pilots/:pilotId/race-entries", httpx.RequireID("pilotId"), raceController.GetEntriesForPilot)
	apiV1.Post("/pilots", v1Controller.CreatePilot)
	apiV1.Get("/pilots/:pilotId", v1Controller.GetPilot)
	apiV1.Patch("/pilots/:pilotId", v1Controller.UpdatePilot)
	apiV1.Delete("/pilots/:pilotId", v1Controller.DeletePilot)
	apiV1.Get("/pilots/:pilotId/expenses", v1Controller.ListExpenses)
	apiV1.Post("/pilots/:pilotId/expenses", v1Controller.CreateExpense)
	apiV1.Get("/pilots/:pilotId/reimbursements", v1Controller.ListReimbursements)
	apiV1.Post("/pilots/:pilotId/reimbursements", v1Controller.CreateReimbursement)
	apiV1.Get("/pilots/:pilotId/closing-preview", v1Controller.PreviewClosing)
	apiV1.Get("/pilots/:pilotId/closings", v1Controller.ListClosings)
	apiV1.Post("/pilots/:pilotId/closings", v1Controller.CreateClosing)
	apiV1.Delete("/expenses/:expenseId", v1Controller.DeleteExpense)
	apiV1.Delete("/reimbursements/:reimbursementId", v1Controller.DeleteReimbursement)
	apiV1.Post("/closings/:closingId/payments", v1Controller.PayClosing)
	apiV1.Delete("/closings/:closingId", v1Controller.DeleteClosing)

	apiV1.Get("/guest-pilots", raceController.GetGuestPilots)
	apiV1.Get("/race-weekends", raceController.GetAll)
	apiV1.Post("/race-weekends", raceController.Create)
	apiV1.Get("/race-weekends/:id", httpx.RequireID("id"), raceController.GetByID)
	apiV1.Patch("/race-weekends/:id", httpx.RequireID("id"), raceController.Update)
	apiV1.Delete("/race-weekends/:id", httpx.RequireID("id"), raceController.Delete)
	apiV1.Post("/race-weekends/:id/entries", httpx.RequireID("id"), raceController.AddEntry)
	apiV1.Get("/race-weekends/:id/agenda", httpx.RequireID("id"), raceController.GetAgenda)
	apiV1.Put("/race-weekends/:id/agenda", httpx.RequireID("id"), raceController.SetAgendaSaldo)
	apiV1.Post("/race-weekends/:id/agenda/expenses", httpx.RequireID("id"), raceController.AddAgendaExpense)
	apiV1.Patch("/race-entries/:entryId", httpx.RequireID("entryId"), raceController.UpdateEntry)
	apiV1.Delete("/race-entries/:entryId", httpx.RequireID("entryId"), raceController.RemoveEntry)
	apiV1.Post("/race-entries/:entryId/payments", httpx.RequireID("entryId"), raceController.PayEntry)
	apiV1.Post("/race-entries/:entryId/expenses", httpx.RequireID("entryId"), raceController.AddEntryExpense)
	apiV1.Post("/race-entries/:entryId/reimbursements", httpx.RequireID("entryId"), raceController.AddEntryReimbursement)
	apiV1.Delete("/race-entry-expenses/:expenseId", httpx.RequireID("expenseId"), raceController.DeleteEntryExpense)
	apiV1.Delete("/race-entry-reimbursements/:reimbursementId", httpx.RequireID("reimbursementId"), raceController.DeleteEntryReimbursement)
	apiV1.Delete("/race-agenda-expenses/:expenseId", httpx.RequireID("expenseId"), raceController.DeleteAgendaExpense)

	configGroup.Get("/", configController.GetConfig)
	configGroup.Put("/", configController.UpdateConfig)

	//Rotas de Admin
	adminGroup := app.Group("/admins")
	adminGroup.Get("/", adminController.GetAllAdmins)
	adminGroup.Post("/", adminController.CreateAdmin)
	adminGroup.Put("/:id", adminController.UpdateAdmin)
	adminGroup.Put("/:id/password", adminController.UpdatePassword)
	adminGroup.Delete("/:id", adminController.DeleteAdmin)

	//Rotas de Pilots
	pilotGroup := app.Group("/pilots")
	pilotGroup.Get("/", pilotController.GetAllPilots)
	pilotGroup.Get("/:id", pilotController.GetPilotById)
	pilotGroup.Post("/", pilotController.CreatePilot)
	pilotGroup.Put("/:id", pilotController.UpdatePilot)
	pilotGroup.Delete("/:id", pilotController.DeletePilot)

	//Rotas de Despesas
	expenseGroup := app.Group("/expenses")
	expenseGroup.Get("/", expenseController.GetAllExpenses)
	expenseGroup.Post("/", expenseController.CreateExpense)
	expenseGroup.Delete("/:id", expenseController.DeleteExpense)

	//Rotas de Reembolso
	reimbursementGroup := app.Group("/reimbursements")
	reimbursementGroup.Get("/", reimbursementController.GetAllReimbursements)
	reimbursementGroup.Post("/", reimbursementController.CreateReimbursement)
	reimbursementGroup.Delete("/:id", reimbursementController.DeleteReimbursement)

	//Rotas de Corridas
	raceGroup := app.Group("/races")
	raceGroup.Get("/", raceController.GetAll)
	raceGroup.Post("/", raceController.Create)
	raceGroup.Get("/guest-pilots", raceController.GetGuestPilots)
	raceGroup.Get("/pilot/:pilotId/entries", raceController.GetEntriesForPilot)
	raceGroup.Get("/:id", raceController.GetByID)
	raceGroup.Put("/:id", raceController.Update)
	raceGroup.Delete("/:id", raceController.Delete)
	raceGroup.Post("/:id/entries", raceController.AddEntry)
	raceGroup.Put("/entries/:entryId", raceController.UpdateEntry)
	raceGroup.Delete("/entries/:entryId", raceController.RemoveEntry)
	raceGroup.Put("/entries/:entryId/pay", raceController.PayEntry)
	raceGroup.Post("/entries/:entryId/expenses", raceController.AddEntryExpense)
	raceGroup.Delete("/entries/expenses/:expenseId", raceController.DeleteEntryExpense)
	raceGroup.Post("/entries/:entryId/reimbursements", raceController.AddEntryReimbursement)
	raceGroup.Delete("/entries/reimbursements/:reimbursementId", raceController.DeleteEntryReimbursement)
	// Agenda (caixinha) por fim de semana — controle pessoal, sem vínculo com pilotos
	raceGroup.Get("/:id/agenda", raceController.GetAgenda)
	raceGroup.Put("/:id/agenda/saldo", raceController.SetAgendaSaldo)
	raceGroup.Post("/:id/agenda/expenses", raceController.AddAgendaExpense)
	raceGroup.Delete("/agenda/expenses/:expenseId", raceController.DeleteAgendaExpense)

	//Rotas de Fechamento
	closingGroup := app.Group("/closing")
	closingGroup.Get("/:pilot_id", closingController.GetSummary)
	closingGroup.Post("/:pilot_id/finalize", closingController.Finalize)
	closingGroup.Get("/:pilotId/history", closingController.GetHistory)
	closingGroup.Put("/history/:closingId/pay", closingController.Pay)
	closingGroup.Delete("/history/:closingId", closingController.Delete)

	// Endpoint de teste: dispara manualmente os jobs diários (fechamento + atrasados)
	// Usar apenas para verificação — remover ou proteger em produção
	app.Post("/admin/trigger-daily-jobs", sessionauth.RequireRole("superadmin"), func(c *fiber.Ctx) error {
		go func() {
			if err := jobs.RunDailyJobs(repo); err != nil {
				log.Printf("[CRON] Execução manual falhou: %v", err)
			}
		}()
		return c.JSON(fiber.Map{"message": "Reconciliação financeira disparada. Verifique os logs do servidor."})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Fatal(app.Listen(":" + port))
}
