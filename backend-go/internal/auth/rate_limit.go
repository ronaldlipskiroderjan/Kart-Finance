package auth

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

func LoginRateLimit() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        10,
		Expiration: time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).Type("application/problem+json").JSON(fiber.Map{
				"type":   "https://kartfinance.local/problems/rate-limit",
				"title":  "Muitas tentativas de login",
				"status": fiber.StatusTooManyRequests,
			})
		},
	})
}
