package billing

import (
	"testing"

	"kartfinance-api/models"
)

func TestCalculateClosingSummary(t *testing.T) {
	summary := Calculate(
		models.Money(50_00),
		[]models.Money{10_25, 20_10},
		[]models.Money{5_05},
		[]models.Money{80_00, 25_30},
	)

	if summary.CurrentPeriodAmount != 75_30 {
		t.Fatalf("expected current amount 75.30, got %s", summary.CurrentPeriodAmount)
	}
	if summary.FinalAmount != 180_60 {
		t.Fatalf("expected final amount 180.60, got %s", summary.FinalAmount)
	}
	if summary.UnpaidPeriodsCount != 2 {
		t.Fatalf("expected two unpaid periods, got %d", summary.UnpaidPeriodsCount)
	}
}
