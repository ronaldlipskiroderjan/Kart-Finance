package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"math/big"
	"strconv"
	"strings"
)

// Money stores a monetary value as integer cents in memory. PostgreSQL persists
// it as NUMERIC(14,2), avoiding binary floating-point rounding.
type Money int64

func ParseMoney(value string) (Money, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, fmt.Errorf("money value is empty")
	}

	rational, ok := new(big.Rat).SetString(value)
	if !ok {
		return 0, fmt.Errorf("invalid money value %q", value)
	}

	rational.Mul(rational, big.NewRat(100, 1))
	if !rational.IsInt() {
		return 0, fmt.Errorf("money value %q has more than two decimal places", value)
	}

	cents := rational.Num()
	if !cents.IsInt64() {
		return 0, fmt.Errorf("money value %q is out of range", value)
	}
	return Money(cents.Int64()), nil
}

func (m Money) String() string {
	sign := ""
	cents := int64(m)
	if cents < 0 {
		sign = "-"
		cents = -cents
	}
	return fmt.Sprintf("%s%d.%02d", sign, cents/100, cents%100)
}

func (m Money) MarshalJSON() ([]byte, error) {
	return []byte(m.String()), nil
}

func (m *Money) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		*m = 0
		return nil
	}

	value := strings.Trim(string(data), `"`)
	parsed, err := ParseMoney(value)
	if err != nil {
		return err
	}
	*m = parsed
	return nil
}

func (m Money) Value() (driver.Value, error) {
	return m.String(), nil
}

func (m *Money) Scan(value any) error {
	if value == nil {
		*m = 0
		return nil
	}

	var raw string
	switch typed := value.(type) {
	case string:
		raw = typed
	case []byte:
		raw = string(typed)
	case int64:
		raw = strconv.FormatInt(typed, 10)
	case float64:
		raw = strconv.FormatFloat(typed, 'f', 2, 64)
	default:
		return fmt.Errorf("cannot scan money from %T", value)
	}

	parsed, err := ParseMoney(raw)
	if err != nil {
		return err
	}
	*m = parsed
	return nil
}

func (Money) GormDataType() string {
	return "numeric(14,2)"
}

func SumMoney(values ...Money) Money {
	var total Money
	for _, value := range values {
		total += value
	}
	return total
}

var _ json.Marshaler = Money(0)
var _ json.Unmarshaler = (*Money)(nil)
var _ driver.Valuer = Money(0)
