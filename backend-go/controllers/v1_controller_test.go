package controllers

import "testing"

func TestParsePeriod(t *testing.T) {
	year, month, err := parsePeriod("2026-08")
	if err != nil {
		t.Fatal(err)
	}
	if year != 2026 || month != 8 {
		t.Fatalf("unexpected period: %d-%d", year, month)
	}
}

func TestParsePeriodRequiresCanonicalFormat(t *testing.T) {
	if _, _, err := parsePeriod("08/2026"); err == nil {
		t.Fatal("expected non-canonical period to be rejected")
	}
}
