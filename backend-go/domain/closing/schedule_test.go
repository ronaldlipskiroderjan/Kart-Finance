package closing

import (
	"testing"
	"time"
)

func TestDuePeriods(t *testing.T) {
	location := mustLocation(t)
	tests := []struct {
		name       string
		createdAt  time.Time
		closingDay int
		now        time.Time
		expected   []string
	}{
		{
			name:       "includes second month",
			createdAt:  time.Date(2026, time.June, 1, 12, 0, 0, 0, location),
			closingDay: 10,
			now:        time.Date(2026, time.July, 10, 8, 0, 0, 0, location),
			expected:   []string{"2026/06", "2026/07"},
		},
		{
			name:       "catches up after closing day",
			createdAt:  time.Date(2026, time.June, 1, 12, 0, 0, 0, location),
			closingDay: 10,
			now:        time.Date(2026, time.July, 11, 8, 0, 0, 0, location),
			expected:   []string{"2026/06", "2026/07"},
		},
		{
			name:       "handles year rollover",
			createdAt:  time.Date(2025, time.December, 1, 12, 0, 0, 0, location),
			closingDay: 10,
			now:        time.Date(2026, time.January, 10, 8, 0, 0, 0, location),
			expected:   []string{"2025/12", "2026/01"},
		},
		{
			name:       "does not backdate pilot created after closing day",
			createdAt:  time.Date(2026, time.June, 11, 12, 0, 0, 0, location),
			closingDay: 10,
			now:        time.Date(2026, time.June, 20, 8, 0, 0, 0, location),
		},
		{
			name:       "includes pilot created on closing day",
			createdAt:  time.Date(2026, time.June, 10, 15, 0, 0, 0, location),
			closingDay: 10,
			now:        time.Date(2026, time.June, 10, 18, 0, 0, 0, location),
			expected:   []string{"2026/06"},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			assertReferences(t, DuePeriods(test.createdAt, test.closingDay, test.now, location), test.expected...)
		})
	}
}

func TestDuePeriodsUsesLastDayForShortMonth(t *testing.T) {
	location := mustLocation(t)
	periods := DuePeriods(
		time.Date(2026, time.January, 1, 12, 0, 0, 0, location),
		31,
		time.Date(2026, time.February, 28, 8, 0, 0, 0, location),
		location,
	)

	assertReferences(t, periods, "2026/01", "2026/02")
	if got := periods[1].ClosingAt.Day(); got != 28 {
		t.Fatalf("expected February closing on day 28, got %d", got)
	}
}

func mustLocation(t *testing.T) *time.Location {
	t.Helper()
	location, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		t.Fatalf("load location: %v", err)
	}
	return location
}

func assertReferences(t *testing.T, periods []Period, expected ...string) {
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
