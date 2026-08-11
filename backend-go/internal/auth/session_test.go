package auth

import "testing"

func TestVerifyPasswordSupportsLegacyAndBcrypt(t *testing.T) {
	valid, legacy := verifyPassword("legacy-secret", "legacy-secret")
	if !valid || !legacy {
		t.Fatal("expected legacy password to be accepted for one-time migration")
	}

	hash, err := HashPassword("modern-secret")
	if err != nil {
		t.Fatal(err)
	}
	valid, legacy = verifyPassword(hash, "modern-secret")
	if !valid || legacy {
		t.Fatal("expected bcrypt password to be accepted without legacy migration")
	}
}
