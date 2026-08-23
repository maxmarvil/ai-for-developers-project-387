# План: Playwright E2E (UC-1…UC-10)

Зафиксировано после grilling-сессии. ADR стека:
[docs/adr/0001-e2e-playwright-api-fixtures.md](./adr/0001-e2e-playwright-api-fixtures.md).
Сценарии: [docs/user-scenarios.md](./user-scenarios.md).

## Решения

| # | Тема | Решение |
|---|------|---------|
| 1 | Target API | Только Playwright fixtures (`page.route`), не Prism и не Laravel |
| 2 | Scope UC | Все UC-1…UC-10 |
| 3 | Error-path (5–7) | Полный mock API в тестах (stateless snapshots + overrides) |
| 4 | Prism в e2e | Не стартуем; Prism только `npm run mock` / ручной dev |
| 5 | Источник fixtures | Ручные typed fixtures в `e2e/fixtures/` (сверка с `schema.d.ts`) |
| 6 | State model | Stateless snapshots; recover UC-5 — счётчик вызовов POST / override GET slots |
| 7 | Структура spec | По потокам: happy / errors / form; в title явный `UC-N` |
| 8 | Время | Playwright clock: `2026-03-11T12:00:00+03:00` (MSK) |
| 9 | Селекторы | `data-testid` на ключевые узлы |
| 10 | Matrix данных | Full: 2 duration, free/pending/confirmed, closed date, error bodies |
| 11 | webServer | Только Vite; mock через `installMockApi(page, overrides?)` |
| 12 | Config/docs | Синхрон с решением (config + AGENTS + front_plan) |
| 13 | CI workflow | Намерение: gate; wiring hexlet-check — **вне** этой задачи |
| 14 | UC-5 глубина | Full recover: fail → другой слот → success |
| 15 | UC-4 isolation | Чистый context; seed guest через `addInitScript` |
| 16 | Error assert | `data-testid="api-error"` + `data-error-code` |
| 17 | UC-6 | Только server `LIMIT_EXCEEDED`; client-warn — не e2e |
| 18 | UC-7 | Только полное закрытие даты; дата **скрыта** из picker |
| 19 | UC-3 | Multi-slot success **и** client cap (>120 мин) |
| 20 | UC-8…10 | Только client-side validation |
| 21 | Open / closed dates | Open happy-path: `2026-03-13`; closed: `2026-03-18` |
| 22 | Confirmation | URL + `booking_group_id` + status pending; нет cancel UI |
| 23 | Spec files | `booking-happy.spec.ts`, `booking-errors.spec.ts`, `form-validation.spec.ts` |
| 24 | Confirmation hooks | `booking-group-id`, `booking-status` |
| 25 | Form hooks | `guest-name/email/phone/comment/submit` + `guest-*-error` |
| 26 | Slot/date testid | Value in id: `slot-10:00`, `date-2026-03-13` |
| 27 | Event types fixture | Только active (inactive не отдаём) |
| 28 | Harness | `e2e/fixtures/mock-api.ts` → `installMockApi` |

## SPA-доработки (обязательны)

1. **`data-testid`**: event type, date, slot, guest fields/errors, api-error, booking-group-id, booking-status.
2. **`data-error-code`** на баннере API-ошибки.
3. **DatePicker**: closed dates **не рендерить** (не disabled).
4. **`saveGuest`** только в `onSuccess` create booking (FR-11 / UC-4/5).
5. При ошибке **`SLOT_TAKEN`**: `invalidateQueries` slots.
6. После обновления slots: **prune** из `selected` всё, что не `free`.

## Структура файлов

```
web/e2e/
  fixtures/
    time.ts       # FROZEN_NOW, OPEN_DATE, CLOSED_DATE, horizon helpers
    data.ts       # event types, slots matrix, success/error bodies
    mock-api.ts   # installMockApi(page, overrides?)
  booking-happy.spec.ts      # UC-1, UC-2, UC-3, UC-4
  booking-errors.spec.ts     # UC-5, UC-6, UC-7
  form-validation.spec.ts    # UC-8, UC-9, UC-10
web/playwright.config.ts     # webServer: Vite only
```

## Покрытие по UC

| UC | Spec | Ассерты (кратко) |
|----|------|------------------|
| UC-1 | happy | Active types; горизонт без today; слоты free/pending/confirmed; closed date отсутствует |
| UC-2 | happy | 1 free slot → form → `/confirmation` + group id + pending; нет cancel |
| UC-3 | happy | 2–3 sequential → общий group id; нельзя выбрать сверх 120 мин |
| UC-4 | happy | Prefill name/email/phone из storage; comment пуст; поля редактируемы |
| UC-5 | errors | POST SLOT_TAKEN → code в DOM, form intact, conflict pending, selection pruned → другой slot → success |
| UC-6 | errors | POST LIMIT_EXCEEDED → code; form не сброшена |
| UC-7 | errors | `date-2026-03-18` нет в DOM |
| UC-8 | form | Невалидный email → `guest-email-error`; остальные поля на месте |
| UC-9 | form | Формат телефона + ошибка при полном невалидном |
| UC-10 | form | Пустые name/email/phone блокируют; comment optional |

## Fixture matrix (минимум)

- Event types: 30 мин + 15 мин (оба active).
- Closed dates: `{ date: "2026-03-18", is_closed: true }`.
- Slots on `2026-03-13` (30м): несколько `free` подряд, ≥1 `pending`, ≥1 `confirmed`.
- POST success: фиксированный `booking_group_id`, `status: "pending"`.
- Errors: тела с `code`: `SLOT_TAKEN`, `LIMIT_EXCEEDED` (+ при необходимости `NOT_FOUND` / `VALIDATION_ERROR` вне e2e-assert).

## Вне scope

- Laravel/Prism в e2e
- Job в hexlet-check / GitHub Actions
- Частичное закрытие даты (UC-7 partial)
- Server-side `VALIDATION_ERROR` в e2e
- Client-side warn лимита дня (UC-6)
- Inactive event types в fixture

## Чеклист реализации

- [x] SPA: testid / error-code / DatePicker hide closed / saveGuest onSuccess / SLOT_TAKEN invalidate / prune selected
- [x] `playwright.config.ts`: только Vite
- [x] `e2e/fixtures/*` + три spec-файла
- [x] `npm run test:e2e` зелёный
- [x] Unit-тесты: prune non-free в `useSlotSelection.test.ts`
- [x] AGENTS.md / front_plan уже синхронизированы с ADR
