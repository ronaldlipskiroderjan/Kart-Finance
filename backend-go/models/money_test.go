package models

import (
	"encoding/json"
	"testing"
)

func TestMoneyJSONRoundTrip(t *testing.T) {
	var amount Money
	if err := json.Unmarshal([]byte(`1234.56`), &amount); err != nil {
		t.Fatalf("unmarshal money: %v", err)
	}
	if amount != 123456 {
		t.Fatalf("expected 123456 cents, got %d", amount)
	}

	encoded, err := json.Marshal(amount)
	if err != nil {
		t.Fatalf("marshal money: %v", err)
	}
	if string(encoded) != "1234.56" {
		t.Fatalf("expected 1234.56, got %s", encoded)
	}
}

func TestMoneyRejectsSubCentValues(t *testing.T) {
	if _, err := ParseMoney("10.001"); err == nil {
		t.Fatal("expected sub-cent value to be rejected")
	}
}
