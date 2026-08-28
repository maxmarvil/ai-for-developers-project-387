# Frontend performance baseline

Reference values for the Lighthouse audit of `https://ctclove.ru/`.

The nightly `lighthouse_schedule` job in
`.github/workflows/frontend-check.yml` compares fresh Lighthouse results
against the values below. A regression of more than 10% on any metric
should open a GitHub issue.

| Metric | Baseline | Notes |
|--------|----------|-------|
| LCP    | 2500 ms  | Largest Contentful Paint |
| CLS    | 0.1      | Cumulative Layout Shift |
| INP    | 200 ms   | Interaction to Next Paint |
| FCP    | 1800 ms  | First Contentful Paint |
| TBT    | 200 ms   | Total Blocking Time |

If this file is missing on a run, the agent should create it with the
current measured values instead of failing.
