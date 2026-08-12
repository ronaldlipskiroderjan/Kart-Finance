package httpx

import "github.com/gofiber/fiber/v2"

type Problem struct {
	Type      string         `json:"type"`
	Title     string         `json:"title"`
	Status    int            `json:"status"`
	Detail    string         `json:"detail,omitempty"`
	RequestID string         `json:"requestId,omitempty"`
	Errors    map[string]any `json:"errors,omitempty"`
}

func WriteProblem(c *fiber.Ctx, status int, problemType, title, detail string) error {
	return c.Status(status).Type("application/problem+json").JSON(Problem{
		Type:      problemType,
		Title:     title,
		Status:    status,
		Detail:    detail,
		RequestID: c.GetRespHeader("X-Request-ID"),
	})
}

func ParseID(c *fiber.Ctx, name string) (uint, error) {
	id, err := c.ParamsInt(name)
	if err != nil || id < 1 {
		return 0, fiber.NewError(fiber.StatusBadRequest, "identificador inválido")
	}
	return uint(id), nil
}

func RequireID(name string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if _, err := ParseID(c, name); err != nil {
			return WriteProblem(c, fiber.StatusBadRequest, "invalid-identifier", "Identificador inválido", err.Error())
		}
		return c.Next()
	}
}

type Collection[T any] struct {
	Data T           `json:"data"`
	Meta interface{} `json:"meta,omitempty"`
}
