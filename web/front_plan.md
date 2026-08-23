# Фронтенд: Календарь бронирований (публичная SPA)

## Проблема

Нужен публичный фронтенд для анонимного бронирования слотов по требованиям `REQUIREMENTS.md`. Бэкенд ещё не написан, поэтому фронт разрабатывается против контракта API (TypeSpec в `api/`) с моком через Prism. Строка стека в `REQUIREMENTS.md` (Blade+HTMX) устарела — согласовано, что делаем **decoupled React SPA**, потребляющую JSON API.

## Текущее состояние

- `api/` — TypeSpec-спецификация (`main.tsp`, `models/`, `routes/`), эмитит OpenAPI 3 в `api/tsp-output/@typespec/openapi3/openapi.v1.json` (см. `api/tspconfig.yaml`). Контракт покрывает публичную часть (event-types, closed-dates, slots, guest-bookings, bookings) и админку (на Filament, вне SPA).
- Backend/Filament-админка — вне зоны этой задачи. SPA покрывает только публичную часть (FR-1…FR-5, FR-11…FR-15).
- CI (`.github/workflows/hexlet-check.yml`) уже настроен; NFR-4 требует прохождения линтера и тестов.

## Согласованные решения по стеку

- **Каркас:** React + TypeScript + Vite, в отдельной папке `web/` в корне (симметрично `api/`), npm.
- **Данные/сеть:** TanStack Query (React Query) + `openapi-fetch`; типы генерируются из OpenAPI через `openapi-typescript`. Без Redux/Zustand — серверное состояние в Query, локальное в `useState`/Context, данные гостя — обёртка над `localStorage` (FR-11, D-5).
- **Мок API:** Stoplight **Prism** поверх сгенерированного `openapi.v1.json`. Vite dev-server проксирует `/api/v1` на Prism.
- **Дата/время:** единый util-модуль на `date-fns` + `date-fns-tz`, всё время держим в `Europe/Moscow` (D-3), горизонт 14 дней (FR-13/D-6), шаг сетки 15/30 мин (BR-5).
- **UI:** Tailwind CSS + shadcn/ui (Radix). Mobile-friendly (NFR-3).
- **Календарь:** собственный компонент сетки (14 дней × слоты), без тяжёлой библиотеки.
- **Роутинг:** минимальный React Router (календарь + подтверждение брони).
- **Тесты/качество:** Vitest + React Testing Library (юниты/компоненты), Playwright (E2E), ESLint + Prettier + `tsc`.

## Предлагаемая структура `web/`

- `web/package.json`, `vite.config.ts`, `tsconfig*.json`, `.eslintrc`, `tailwind.config.ts`, `postcss.config.js`
- `web/src/api/` — сгенерированные типы (`schema.d.ts`), настроенный `openapi-fetch` клиент, query-хуки
- `web/src/lib/datetime.ts` — единый util по времени/зоне/горизонту/сетке
- `web/src/lib/guest-storage.ts` — обёртка над `localStorage` для данных гостя
- `web/src/lib/phone.ts` — валидация телефона `+7 (XXX) XXX-XX-XX` (NFR-1) и email
- `web/src/features/booking/` — календарь-сетка, выбор типа события, выбор последовательных слотов, форма гостя, подтверждение
- `web/src/components/ui/` — shadcn/ui примитивы
- `web/e2e/` — Playwright сценарии (API fixtures via `page.route`, не Prism/Laravel; см. `docs/adr/0001-e2e-playwright-api-fixtures.md`)

## Ключевые задачи реализации

1. Скаффолд Vite+React+TS в `web/`, Tailwind + shadcn/ui, ESLint/Prettier, Vitest+RTL, Playwright.
2. Скрипты генерации: `api` компилирует TypeSpec → OpenAPI; `web` запускает `openapi-typescript` для `schema.d.ts` и Prism-мок; Vite-прокси `/api/v1` → Prism.
3. `openapi-fetch` клиент + TanStack Query провайдер и типизированные хуки на каждый публичный эндпоинт.
4. Util даты/времени (Europe/Moscow, 14 дней, текущий день недоступен, шаг 15/30) и клиентские валидации (email, телефон, лимит 2ч и последовательность слотов как UX-подсказки; бэкенд всё равно источник правды).
5. UI-поток: выбор типа события → сетка слотов (pending визуально выделены, FR-15) → выбор одного/нескольких последовательных слотов (FR-12) → форма гостя (предзаполнение из localStorage) → POST → страница подтверждения.
6. Обработка ошибок API по `ErrorCode` (LIMIT_EXCEEDED, SLOT_TAKEN, SLOT_UNAVAILABLE, DATE_OUT_OF_RANGE, SLOT_NOT_SEQUENTIAL, VALIDATION_ERROR).
7. Тесты: юниты util/валидаций, компонентные тесты сетки/формы, E2E UC-1…UC-10 против Playwright API fixtures (не Prism).
8. **Создать `AGENTS.md`** в корне с описанием стека, структуры, команд (dev/mock/gen/test/lint) и конвенций.

## AGENTS.md (содержание)

Описание: назначение проекта; стек фронта (React+TS+Vite, TanStack Query, openapi-fetch, Tailwind+shadcn/ui, date-fns/-tz, React Router, Vitest+RTL, Playwright); откуда берётся контракт (TypeSpec → OpenAPI → типы); как поднять мок (Prism); команды; правила по времени/валидации; что вне области SPA (Filament-админка, бэкенд).

## Проверка

- `npm run lint`, `tsc --noEmit`, `npm test` (Vitest) — зелёные.
- Playwright e2e (happy + errors + form) проходит против in-test API fixtures.
- Ручная проверка на мобильной ширине (NFR-3).
