package services

import "testing"

func TestPeriodRange(t *testing.T) {
	start, end, err := periodRange("2026-08")
	if err != nil {
		t.Fatal(err)
	}
	if got := start.Format("2006-01-02"); got != "2026-08-01" {
		t.Fatalf("unexpected start: %s", got)
	}
	if got := end.Format("2006-01-02"); got != "2026-09-01" {
		t.Fatalf("unexpected end: %s", got)
	}
}

func TestPeriodRangeRejectsInvalidMonth(t *testing.T) {
	if _, _, err := periodRange("2026-13"); err == nil {
		t.Fatal("expected invalid period to be rejected")
	}
}
