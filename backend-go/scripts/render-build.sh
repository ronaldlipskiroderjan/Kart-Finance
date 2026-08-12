#!/usr/bin/env sh
set -eu

mkdir -p bin
go build -tags netgo -trimpath -ldflags="-s -w" -o bin/kart-finance-api .
go build -tags netgo -trimpath -ldflags="-s -w" -o bin/migrate ./cmd/migrate
