.PHONY: dev test compose-up compose-down

dev:
	go run ./cmd/api

test:
	go test ./...

compose-up:
	docker compose up --build

compose-down:
	docker compose down
