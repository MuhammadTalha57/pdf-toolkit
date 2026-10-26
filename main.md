# main.md — Running log: Playwright (Python) testing project for PDF Toolkit

> Is file mein har step likha jayega. Jahan input chahiye wahan "❓ OPEN QUESTION" likha hai.

## Assignment (summary)
- 4 important features × 3 E2E tests each (positive + negative) = **12 E2E tests**
- **4 API tests** (CRUD)
- **2 network-mocking tests** (empty data / server error)
- Run on **Chromium, Firefox + more** (WebKit)
- Add **1 intentional bug**, show a test failing, show full results
- Deliverables (zip): test files, HTML report, screenshots, short report (test-case table, features tested / left out + reasons, bugs, member-wise work)
- Both members must be able to explain every test in the demo

## Project analysis (log #1)
- Site under test: PDF Toolkit — Next.js frontend (`apps/web`) + Express API (`apps/api`)
- Live: https://pdf-toolkit-web-orcin.vercel.app/
- Pages: `/` (landing), `/merge`, `/split`, `/organize`
- API: `GET /health`, `GET /`, `POST /pdf/upload`, `/pdf/merge`, `/pdf/split`, `/pdf/organize`
- Existing tests: Vitest unit tests on API services only (no browser tests)
- Environment: Python 3.12, Node 24 available. Playwright not yet installed.

### Findings that affect the design
1. **No PUT/DELETE/PATCH endpoints.** API is POST-heavy, so "all CRUD" does not map directly.
2. **Upload goes to Vercel Blob** (needs `BLOB_READ_WRITE_TOKEN`), so real E2E against local API needs a token or a stub.
3. Frontend reads `NEXT_PUBLIC_API_BASE_URL`; calls API directly from the browser (so Playwright can mock via `page.route`).
4. Upload max 4MB, PDF only; page-range parser has validation messages (good negative-test material).

## Decisions (user answers, 2026-10-22)
- Q1 Features: **Merge, Split, Organize, Upload validation**
- Q2 CRUD: **add small GET/PUT/DELETE endpoints** to the API
- Q3 Target: **local web + API, blob upload stubbed** (no Vercel token needed)
- Q4 Team: partner name **pending** (placeholders Member A / Member B, 50-50 split until told)

## Design (APPROVED by user in chat; written spec: docs/superpowers/specs/2026-10-22-playwright-testing-design.md)
- New folder `e2e-tests/` (Python, pytest-playwright, pytest-html, pypdf for sample PDFs)
- API gets `BLOB_STUB=1` mode: in-memory store instead of Vercel Blob (real mode untouched)
- New endpoints (CRUD): POST /pdf/upload (C, exists), GET /pdf/file?url= (R), PUT /pdf/file (U), DELETE /pdf/file?url= (D)
- 12 E2E, 4 API, 2 mock tests; run on chromium/firefox/webkit; screenshot per test; HTML report
- Intentional bug: off-by-one in `ranges.ts` (toggle, reverted afterwards) to show failing tests


## Progress log (all done 2026-10-22)
- [x] Explored codebase; decisions; design + spec + plan approved
- [x] Task 1: API stub store, server.ts, RATE_LIMIT_MAX (vitest 15/15)
- [x] Task 2: e2e-tests scaffolding + smoke test
- [x] Task 3: GET/PUT/DELETE /pdf/file + 4 API tests (4/4)
- [x] Tasks 4-7: 12 E2E tests; Task 8: 2 mocking tests
- [x] Task 9: chromium+firefox+webkit -> 49 passed (report_all_pass.html)
- [x] Task 10: bug-demo branch (ranges.ts >= bug) -> 1 failed / 18 passed (report_bug.html)
- [x] Task 11: REPORT.md + submission.zip

## Rulings
- Ledger kept in this file instead of .superpowers/ workspace (simpler for the user).
- Final review was a self-review (no per-task reviewer subagent; user did not ask for subagents).
- Bug 2 (silent failure on empty `{}` merge response) logged, NOT fixed (outside scope; asked user in final message).

## Still needed from user
- Partner name(s) and real work split (REPORT.md has Member A / Member B placeholders)
