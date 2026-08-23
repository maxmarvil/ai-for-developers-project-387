# Booking Calendar — Stack and Conventions

## Project overview

Web application for booking time slots without visitor registration.
Administrator manages in a Filament-protected admin panel.

Tech stack as per [REQUIREMENTS.md](../REQUIREMENTS.md):
PHP 8.x + Laravel, Filament admin, React SPA, PostgreSQL.

Agreement per `web/front_plan.md`: the public face is a **decoupled
React SPA** consuming a JSON API via OpenAPI contract (TypeSpec in `api/`).
The Laravel backend and Filament admin panel are implemented in `backend/`.

CI (`hexlet-check.yml`) runs: lint, tests, Playwright E2E.

---

## Front-end stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **React 18** (TSX) | Hooks-only, no class components |
| Build | **Vite 5** | HMR, prod build via `tsc -b && vite build` |
| Language | **TypeScript 5** | Strict mode, path alias `@/` |
| Routing | **React Router DOM 6** (`BrowserRouter`) | SPA routes: `/`, `/confirmation` |
| State (server) | **TanStack Query v5** (`@tanstack/react-query`) | Cache, prefetch, infinite scroll ready. No Redux / Zustand — server state lives in Query. |
| State (local) | `useState` + `useMemo` + `createContext` | Minimal; most UI driven by query cache |
| HTTP client | **openapi-fetch** | Type-safe generated from OpenAPI 3 (`schemas.d.ts`) |
| Date/time | **date-fns** + **date-fns-tz** | All time in `Europe/Moscow` (D-3). Grid logic via `addMinutes`, `format`. Horizon = 14 days forward (FR-13 / D-6). Today excluded (FR-14 / D-6). |
| Validation | Custom (`src/lib/validation.ts`) | Email regex + phone display format `+7 (XXX) XXX-XX-XX` progressive formatter (NFR-1) |
| Persistence | **localStorage** wrapper (`src/lib/guest-storage.ts`) | Guest identity keyed on email (FR-11, D-5) |
| CSS | **Tailwind CSS 3** + `tailwind-merge` + `clsx` | Utility-first. shadcn/ui primitives in `components/ui/`. Mobile-friendly (NFR-3). |
| UI primitives | **shadcn/ui** (Radix primitives) | `Button`, `Card`, `Input` — hand-tailored, no heavy component libs |
| Calendar grid | **Custom** (no fullcalendar/FCP) | 14 days × slots of 15/30-min step. React-rendered table/grid (BR-5). Bookable dates = tomorrow through +14 days. Current day excluded (FR-14 / D-6). Pending booking highlight via dashed amber outline (FR-15). |
| Backend API | **Laravel 12** in `backend/` | Public API under `/api/v1`, Filament admin under `/admin`. |
| Mock server | **Stoplight Prism** (`@stoplight/prism-cli`) | OpenAPI 3 spec → in-memory JSON API. Can still be started with `npm run mock` for isolated frontend work. |
| Testing — unit | **Vitest 2** + **@testing-library/react** | `vitest run`, jsdom environment, globals enabled, `src/test/setup.ts` for cleanup |
| Testing — E2E | **Playwright** | Chromium, trace on first retry. Tests in `e2e/`. API via `page.route` fixtures (not Prism/Laravel). See [docs/adr/0001-e2e-playwright-api-fixtures.md](./docs/adr/0001-e2e-playwright-api-fixtures.md). |

### Key constants and business rules (FR / BR / D refs)

| Constant | File | Value | Rule |
|----------|------|-------|------|
| `APP_TIMEZONE` | `lib/datetime.ts` | `'Europe/Moscow'` | D-3 |
| `BOOKING_HORIZON_DAYS` | `lib/datetime.ts` | `14` | FR-13, D-6 |
| `MAX_TOTAL_MINUTES` | `lib/datetime.ts` | `120` | BR-1 (2h per guest) |
| Duration options | `models/admin.tsp` / OpenAPI | `15` or `30` minutes | BR-5 |

### Booking flow (FR-1 through FR-4)

1. **Select event type** → filters available slot grid.
2. **Pick date** → show bookable slots for that date.
3. **Select one or more sequential slots** → single operation, saved as
   multiple `booking` records sharing a `booking_group_id` (FR-12, D-7).
4. **Fill guest details** (name, email, phone; comment is optional) → POST `/bookings`.
5. **Confirmation** on route `/confirmation` page (no email notifications in v1, FR-4).

### Slot selection rules (in `useSlotSelection.ts`)

- Only slots with `status === 'free'` are selectable.
- Selection must remain contiguous: next slot must be adjacent to first or last.
- Total duration may not exceed `MAX_TOTAL_MINUTES` (120 min = 2 hours).
- Deselecting an edge shrinks the run; deselecting a middle item resets to single.

### Guest identity persistence (FR-11, D-5)

Guest data is stored in `localStorage` under key `booking:guest`:
```json
{"name": "Ivan", "email": "ivan@example.com", "phone": "+7 (999) 000-00-00"}
```
Email serves as the unique identifier; name and phone are pre-filled on
subsequent bookings. No `comment` is persisted on the client side.

### OpenAPI contract source (`api/`)

The API spec lives in **TypeSpec** (`main.tsp`, `models/`, `routes/`).
Compiled to OpenAPI 3 (`openapi.v1.json`) → TypeScript types via
`openapi-typescript` → `src/api/schema.d.ts`.

Front-end imports only what's needed from the contract:
- `EventType`, `Slot`, `BookingStatus`, `ApiError`, `ErrorCode`
- `CreateBookingRequest`, `GuestInput`, etc.

### Routing (React Router)

| Route | Component | Notes |
|-------|-----------|-------|
| `/` | `BookingPage` | Main booking wizard with conditional sections (event type → date → slots → guest form). |
| `/confirmation` | `ConfirmationPage` | Booking confirmation page showing `booking_group_id` and status. No logout / cancel for visitor (D-4). |
| `*` | `<Navigate to="/" />` | Catch-all redirect to booking page.

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite HMR dev server (:5173) |
| `npm run build` | Production build (`tsc -b && vite build`) |
| `npm test` | Run Vitest unit tests (`vitest run`) |
| `npm run test:watch` | Watch mode (`vitest`) |
| `npm run test:e2e` | Playwright E2E (Vite + in-test API fixtures) |
| `npm run mock` | Standalone Stoplight Prism on :4010 |
| `npm run lint` | ESLint + Prettier check (`eslint . && prettier --check .`) |
| `npm run format` | Prettier auto-fix (`prettier --write .`) |
| `npm run typecheck` | TypeScript compiler (`tsc --noEmit`) |

## Git conventions

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
`<type>(<optional scope>): <short imperative summary>`.

- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- Scope (optional): affected area, e.g. `api`, `web`, `admin`, `e2e`.
- Summary in English, lowercase, no trailing period, ≤ 72 chars.
- Breaking changes: `!` after type/scope (e.g. `feat(api)!:`) plus a `BREAKING CHANGE:` footer.
- One commit = one logical change; body (optional) explains *why*, not *what*.

Examples:
```
feat(web): add slot grid with pending highlight
fix(api): enforce 2h daily limit per guest email
docs: add visitor user scenarios
```

PRs merge into `main` via **squash**; the PR title must itself be a
conventional commit (release-please reads commit titles on `main`).

## Releases

Releases are automated by [release-please](https://github.com/googleapis/release-please)
(`.github/workflows/release-please.yml`). One release covers the whole repo;
see [docs/adr/0002-release-please-single-release.md](./docs/adr/0002-release-please-single-release.md).

- Version source: `web/package.json`; manifest — `.release-please-manifest.json`,
  config — `release-please-config.json` (single package `web`,
  `include-component-in-tag: false` → tags `vX.Y.Z`).
- On push to `main`, release-please maintains a release PR; merging it tags
  the release and publishes a GitHub Release with `web/CHANGELOG.md`.
  Nothing is deployed after the release.
- Any `feat`/`fix` bumps the release regardless of scope; `docs`, `ci`,
  `chore` stay out of the changelog.

## Code organisation

```
web/
├── package.json                    # Scripts: dev, build, mock, test, lint
├── vite.config.ts                  # Jest-dom setup, alias @/, proxy for Laravel backend
├── tsconfig.json                   # Strict TS, @/* → src/*
├── postcss.config.js               # Tailwind config loader
├── tailwind.config.ts              # Theme + plugins (shadcn/ui preset)
├── index.html                      # Single HTML entry point
├── e2e/                            # Playwright tests
│   └── booking.spec.ts             # Booking flow E2E
├── src/
│   ├── main.tsx                    # App bootstrap: QueryClient + BrowserRouter + RouterProvider
│   ├── App.tsx                     # Top-level routes: / → BookingPage
│   ├── index.css                   # Tailwind base + shadcn/ui CSS vars
│   └── api/
│       ├── schema.d.ts             # Auto-generated: OpenAPI TS types (schemas.d.ts)
│       ├── hooks.ts                # Typed API endpoints via openapi-fetch
│       ├── bookings.ts           # Booking logic & slot selection (FR-12 / D-7)
│       └── validation.ts         # Email + Russian phone formatter (NFR-1)
│   │   ├── lib/                  # Guest storage (localStorage wrapper, FR-11 / D-5)
│   │       ├── datetime.ts         # Europe/Moscow time utils, 14-day horizon (FR-13 / D-6), slot step logic (BR-5), etc.
│   │       └── validation.ts     # Email regex + phone display formatter (+7 XXX)
│   │       └── guest-storage.ts  # localStorage: loadGuest(), saveGuest() (FR-11, D-5)
│   ├── features/booking/         # Feature module: all booking flow components
│   │   ├── BookingPage           # Main UI wizard (step 1–4 logic)
│   │   ├── EventTypeSelector.tsx # Event type picker with icons
│   │   ├── SlotGrid.tsx          # Slot grid renderer (FR-1, FR-15)
│   │   └── GuestForm.tsx         # Booking form with validation & submission
│   │   ├── ConfirmationPage.tsx  # Post-booking confirmation page
│   │   └── index.ts              # Feature barrel exports
│   └── components/
│       └── ui/                   # shadcn/ui primitives (Button, Card, Input)
├── test/                         # Vitest configuration & fixtures
    ├── setup.ts                    # jest-dom extensions + afterEach cleanup
    └── booking.spec.ts             # Booking flow E2E
```

## Testing strategy

### Unit tests (`vitest`)

Each public-facing module should have at least one `*.test.ts(x)` file:
- `datetime.test.ts` → `addMinutesToTime`, `minutesBetween`, `formatDateLabel`, `isNextDay`, etc.
- `validation.test.ts` → `isValidEmail`, `isValidPhone`, `formatPhone`.
- `guest-storage.test.ts` → loadGuest, saveGuest, clearGuest (localStorage mock).
- `useSlotSelection.test.ts` → toggle contiguous selection, BR-1 cap, status filtering.

### E2E tests (`playwright`)

Scenarios from [docs/user-scenarios.md](./docs/user-scenarios.md); stack decision in
[docs/adr/0001-e2e-playwright-api-fixtures.md](./docs/adr/0001-e2e-playwright-api-fixtures.md).

- `webServer`: Vite only; `/api/v1` mocked with `installMockApi(page, overrides?)`.
- Clock frozen to `2026-03-11T12:00:00+03:00` (MSK); open date `2026-03-13`, closed `2026-03-18` (hidden in picker).
- Specs by flow: `booking-happy.spec.ts` (UC-1…4), `booking-errors.spec.ts` (UC-5…7), `form-validation.spec.ts` (UC-8…10).
- Test titles include `UC-N`; selectors prefer `data-testid` (`slot-10:00`, `date-2026-03-13`, guest fields, `api-error` + `data-error-code`).

### Quality gates (CI / NFR-4)

1. `npm run lint` — ESLint + Prettier check.
2. `npm run typecheck` — `tsc --noEmit`.
3. `npm test` — Vitest unit tests.
4. `npm run test:e2e` — Playwright E2E (fixtures; intended CI gate, workflow wiring separate).
