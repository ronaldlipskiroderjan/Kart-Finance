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
	pilotController := controllers.NewPilotController(repo)
	expenseController := controllers.NewExpenseController(repo)
	reimbursementController := controllers.NewReimbursementController(repo)
	closingController := controllers.NewClosingController(closingService)


	// Rotas da API
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("API RA Kart Racing em Go está ONLINE! 🏎️💨")
	})

	//Rotas de Auth
	authGroup := app.Group("/auth")
	authGroup.Post("/login", authController.Login)

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

	//Rotas de Fechamento
	closingGroup := app.Group("/closing")
	closingGroup.Get("/:pilot_id", closingController.GetSummary)
	closingGroup.Post("/:pilot_id/finalize", closingController.Finalize)
	closingGroup.Get("/:pilotId/history", closingController.GetHistory)
	closingGroup.Put("/history/:closingId/pay", closingController.Pay)


	port := os.Getenv("PORT")
	if port == "" {
			port = "8080"
	}

	log.Fatal(app.Listen(":" + port))
}