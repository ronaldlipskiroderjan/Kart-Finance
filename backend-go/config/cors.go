package config

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"os"
	"strings"
)

func SetupCors(app *fiber.App) {
	allowedOrigins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:5173"
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, X-CSRF-Token",
		AllowMethods:     "GET, POST, PATCH, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))
}
