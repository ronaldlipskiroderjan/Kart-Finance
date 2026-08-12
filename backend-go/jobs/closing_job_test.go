package jobs

import (
	"testing"
	"time"

	closingdomain "kartfinance-api/domain/closing"
	"kartfinance-api/models"
)

func TestPendingPeriodsSelectsSecondMonth(t *testing.T) {
	location := BrazilLocation()
	pilot := models.Pilot{
		ID:         1,
		ClosingDay: 10,
		CreatedAt:  time.Date(2026, time.June, 1, 12, 0, 0, 0, location),
		ClosingHistories: []models.ClosingHistory{
			{PilotID: 1, MonthReference: "2026/06", Status: models.StatusPendente},
		},
	}

	periods := pendingPeriods(pilot, time.Date(2026, time.July, 10, 8, 0, 0, 0, location))

	assertPendingReferences(t, periods, "2026/07")
}

func TestPendingPeriodsRecoversMissedClosingOnFollowingDay(t *testing.T) {
	location := BrazilLocation()
	pilot := models.Pilot{
		ID:         1,
		ClosingDay: 10,
		CreatedAt:  time.Date(2026, time.June, 1, 12, 0, 0, 0, location),
		ClosingHistories: []models.ClosingHistory{
			{PilotID: 1, MonthReference: "2026/06", Status: models.StatusPago},
		},
	}

	periods := pendingPeriods(pilot, time.Date(2026, time.July, 11, 8, 0, 0, 0, location))

	assertPendingReferences(t, periods, "2026/07")
}

func TestPendingPeriodsIsIdempotent(t *testing.T) {
	location := BrazilLocation()
	pilot := models.Pilot{
		ID:         1,
		ClosingDay: 10,
		CreatedAt:  time.Date(2026, time.June, 1, 12, 0, 0, 0, location),
		ClosingHistories: []models.ClosingHistory{
			{PilotID: 1, MonthReference: "2026/06", Status: models.StatusPago},
			{PilotID: 1, MonthReference: "2026/07", Status: models.StatusPendente},
		},
	}

	periods := pendingPeriods(pilot, time.Date(2026, time.July, 11, 8, 0, 0, 0, location))

	assertPendingReferences(t, periods)
}

func assertPendingReferences(t *testing.T, periods []closingdomain.Period, expected ...string) {
	t.Helper()
	if len(periods) != len(expected) {
		t.Fatalf("expected %d periods, got %d: %#v", len(expected), len(periods), periods)
	}
	for index, reference := range expected {
		if got := periods[index].Reference(); got != reference {
			t.Errorf("period %d: expected %s, got %s", index, reference, got)
		}
	}
}
