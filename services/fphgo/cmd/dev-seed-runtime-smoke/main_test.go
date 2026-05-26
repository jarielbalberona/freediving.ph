package main

import "testing"

func TestEnsureLocalDevTargetRejectsProductionEnv(t *testing.T) {
	err := ensureLocalDevTarget("postgres://postgres:postgres@localhost:5433/fph?sslmode=disable", "production")
	if err == nil {
		t.Fatal("expected production APP_ENV to be rejected")
	}
}

func TestEnsureLocalDevTargetRejectsRemoteHost(t *testing.T) {
	err := ensureLocalDevTarget("postgres://user:pass@db.example.com:5432/fph?sslmode=require", "development")
	if err == nil {
		t.Fatal("expected remote host to be rejected")
	}
}

func TestEnsureLocalDevTargetAcceptsLocalDevelopment(t *testing.T) {
	err := ensureLocalDevTarget("postgres://postgres:postgres@localhost:5433/fph?sslmode=disable", "development")
	if err != nil {
		t.Fatalf("expected local development DSN to be accepted: %v", err)
	}
}
