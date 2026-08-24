.PHONY: up down install dev backend-dev frontend-dev \
        test backend-test frontend-test lint backend-lint frontend-lint \
        migrate fresh seed composer artisan tinker \
        prod-build prod-preview e2e

# ---------- Infrastructure (docker compose) ----------

up:
	docker compose up -d
	@echo "Stack is up:"
	@echo "  Frontend (SPA) ... http://localhost:8000"
	@echo "  Admin (Filament) . http://localhost:8000/admin"
	@echo "  Adminer (DB GUI) . http://localhost:8080"

down:
	docker compose down

# ---------- Installation (host) ----------

install: backend-install frontend-install

backend-install:
	cd backend && composer install

frontend-install:
	cd web && npm install

# ---------- Development (host) ----------

dev:
	$(MAKE) up
	@echo "For hot-reload, run 'make backend-dev' and 'make frontend-dev' in separate terminals"

backend-dev:
	cd backend && php artisan serve

frontend-dev:
	cd web && npm run dev

# ---------- Testing ----------

test: backend-test frontend-test

backend-test:
	cd backend && ./vendor/bin/pest --no-coverage

frontend-test:
	cd web && npm test

e2e:
	cd web && npm run test:e2e

# ---------- Linting ----------

lint: backend-lint frontend-lint

backend-lint:
	cd backend && ./vendor/bin/pint --test
	cd backend && ./vendor/bin/phpstan analyse --memory-limit=512M --no-progress

frontend-lint:
	cd web && npm run lint

# ---------- Database (host php talks to compose postgres) ----------

migrate:
	cd backend && php artisan migrate

fresh:
	cd backend && php artisan migrate:fresh

seed:
	cd backend && php artisan db:seed

# ---------- Shortcuts ----------

composer:
	cd backend && composer $(filter-out $@,$(MAKECMDGOALS))

artisan:
	cd backend && php artisan $(filter-out $@,$(MAKECMDGOALS))

tinker:
	cd backend && php artisan tinker

# Catch-all for arguments to composer/artisan
%:
	@:

# ---------- Production preview ----------

prod-build:
	docker compose build app

prod-preview:
	docker compose up app
