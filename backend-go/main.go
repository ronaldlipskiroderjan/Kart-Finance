package main

import (
	"log"
	"os"

	"kartfinance-api/config"
	"kartfinance-api/controllers"
	"kartfinance-api/jobs"
	"kartfinance-api/repository"
	"kartfinance-api/services"


	"github.com/gofiber/fiber/v2"
)

func main() {
	
	config.ConnectDB()
	app := fiber.New()
	config.SetupCors(app)
	repo := repository.NewRepository(config.DB)

	closingService := services.NewClosingService(repo)
	jobs.InitCron(repo, closingService)

	authController := controllers.NewAuthController(repo)
	adminController := controllers.NewAdminController(repo)
	configController := controllers.NewConfigController(repo)
	pilotController := controllers.NewPilotController(repo)
	expenseController := controllers.NewExpenseController(repo)
	reimbursementController := controllers.NewReimbursementController(repo)
	closingController := controllers.NewClosingController(closingService)

	raceService := services.NewRaceService(repo)
	raceController := controllers.NewRaceController(raceService)


	// Rotas da API
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("API RA Kart Racing em Go está ONLINE! 🏎️💨")
	})

	//Rotas de Auth
	authGroup := app.Group("/auth")
	authGroup.Post("/login", authController.Login)

	//Rotas de Configuração Global
	configGroup := app.Group("/config")
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
	app.Post("/admin/trigger-daily-jobs", func(c *fiber.Ctx) error {
		go jobs.RunDailyJobs(repo, closingService)
		return c.JSON(fiber.Map{"message": "Jobs diários disparados. Verifique os logs do servidor."})
	})


	port := os.Getenv("PORT")
	if port == "" {
			port = "8080"
	}

	log.Fatal(app.Listen(":" + port))
}