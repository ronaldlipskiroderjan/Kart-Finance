#!/usr/bin/env sh
set -eu

./bin/migrate
exec ./bin/kart-finance-api
