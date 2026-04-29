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

	_ = repository.NewRepository(config.DB)

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("API RA Kart Racing em Go está ONLINE! 🏎️💨")
	})

	port := os.Getenv("PORT")
	if port == "" {
			port = "8080"
	}

	log.Fatal(app.Listen(":" + port))
}