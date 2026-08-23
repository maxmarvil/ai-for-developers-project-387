# E2E against Playwright API fixtures, not Prism or Laravel

Public booking E2E (UC-1…UC-10) runs the Vite app under Playwright and serves `/api/v1` via in-test `page.route` handlers and hand-written fixtures. Prism stays for local `npm run mock` only; Laravel is out of the E2E loop for now.

**Why:** Prism cannot drive stateful error paths (slot race, day limit, closed dates) deterministically. A real backend needs seed/isolation and slows CI. Full fixture mocks give one stack, frozen clock, and recoverable error scenarios without dual environments.

**Consequences:** E2E does not prove backend integration; contract drift is manual against `schema.d.ts`. SPA must expose stable `data-testid` / `data-error-code` hooks. `playwright.config` starts only Vite.
