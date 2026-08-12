package services

import (
	"testing"

	"kartfinance-api/models"
)

func TestValidatePilotAllowsZeroFee(t *testing.T) {
	err := validatePilot(PilotInput{Name: "Piloto", BaseFee: models.Money(0), ClosingDay: 10})
	if err != nil {
		t.Fatalf("expected valid pilot: %v", err)
	}
}

func TestValidatePilotRejectsInvalidClosingDay(t *testing.T) {
	err := validatePilot(PilotInput{Name: "Piloto", BaseFee: models.Money(10_00), ClosingDay: 32})
	if err == nil {
		t.Fatal("expected closing day 32 to be rejected")
	}
}
