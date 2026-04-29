package main

import (
	"log"
	"os"

	"kartfinance-api/config"
	"kartfinance-api/repository"

	"github.com/gofiber/fiber/v2"
)

func main() {
	
	config.ConnectDB()
	app := fiber.New()
	config.SetupCors(app)
	repo := repository.NewRepository(config.DB)

	authController := controllers.NewAuthController(repo)
	pilotController := controllers.NewPilotController(repo)


	// Rotas da API
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("API RA Kart Racing em Go está ONLINE! 🏎️💨")
	})

	//Auth
	authGroup := app.Group("/auth")
	authGroup.Post("/login", authController.Login)

	//Pilot
	pilotGroup := app.Group("/pilots")
	pilotGroup.Get("/", pilotController.GetAllPilots)
	pilotGroup.Get("/:id", pilotController.GetPilotById)
	pilotGroup.Post("/", pilotController.CreatePilot)
	pilotGroup.Put("/:id", pilotController.UpdatePilot)
	pilotGroup.Delete("/:id", pilotController.DeletePilot)


	port := os.Getenv("PORT")
	if port == "" {
			port = "8080"
	}

	log.Fatal(app.Listen(":" + port))
}