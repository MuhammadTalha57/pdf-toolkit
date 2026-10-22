# Playwright Testing Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python Playwright suite (12 E2E, 4 API CRUD, 2 network-mock tests) for PDF Toolkit, run on 3 browsers, with an intentional-bug demo and a submission zip.

**Architecture:** The API gets a `BLOB_STUB=1` in-memory file store plus `/pdf/file` CRUD endpoints. A pytest session fixture boots API (:4000) and a production-built web app (:3000). Tests live in `e2e-tests/`.

**Tech Stack:** Python 3.12, pytest, pytest-playwright, pytest-html, pypdf, requests; Express/TypeScript (existing), tsx.

**Spec:** `docs/superpowers/specs/2026-10-22-playwright-testing-design.md`

**Spec amendment:** `apps/api/src/server.ts` does not exist in the repo (README says to add it), so Task 1 creates it. Stub file URLs have the form `http://localhost:4000/pdf/file?url=<key>`, so `readPDFFromURL` (plain `fetch`) works unchanged against the stub.

## Global Constraints
- Browsers: chromium, firefox, webkit. Python 3.12.
- Stub mode only when `BLOB_STUB=1`; real Vercel Blob path unchanged otherwise.
- Upload limit 4MB (4 * 1024 * 1024 bytes), PDF only (existing behaviour; do not change).
- Rate limiter must not break test runs: `RATE_LIMIT_MAX` env (default 100).
- Log progress in `main.md` after each task; ask the user when blocked.
- Never commit the intentional bug to `main`.

## Review Focus
- Rate limiter (100 req / 15 min) hit during the 3-browser run: Task 1 makes max configurable; fixture sets a high value.
- Stub store lookup of unknown key returns 404, not a crash (Task 3 tests).
- `PUT` with a non-PDF returns 400 (Task 3 tests).
- `NEXT_PUBLIC_API_BASE_URL` is baked at build time, so Task 2 builds with it set.
- The file input is hidden: use `set_input_files`, never click the dropzone.

---

### Task 1: API stub store, server entry, configurable rate limit

**Files:**
- Create: `apps/api/src/server.ts`, `apps/api/src/utils/stubStore.ts`, `apps/api/src/utils/stubStore.test.ts`
- Modify: `apps/api/src/utils/blobUtils.ts`, `apps/api/src/app.ts` (limiter `max: Number(process.env.RATE_LIMIT_MAX ?? 100)`)

**Interfaces:**
- Produces (`stubStore.ts`): `putStub(file: File): Promise<{ url: string; key: string }>`, `getStub(key: string): Buffer | undefined`, `replaceStub(key: string, bytes: Buffer): boolean`, `deleteStub(key: string): boolean`, `isStubMode(): boolean` (true when `process.env.BLOB_STUB === "1"`).
- `uploadBlob(file)` returns `{ url }` from `putStub` when `isStubMode()`.

- [ ] **Step 1: Write failing vitest** `stubStore.test.ts`: put then get returns same bytes; `replaceStub` on unknown key returns false; `deleteStub` removes, then `getStub` is undefined; returned url ends with `/pdf/file?url=${key}`.
- [ ] **Step 2:** `cd apps/api && npx vitest run src/utils/stubStore.test.ts` -> FAIL (module missing).
- [ ] **Step 3:** Implement `stubStore.ts` (Map keyed by `crypto.randomUUID()`; origin `http://localhost:${process.env.PORT ?? 4000}`), wire into `blobUtils.ts`, add `server.ts` per the api README snippet, parameterize the limiter.
- [ ] **Step 4:** same command -> PASS; `npx vitest run` whole API suite still PASS.
- [ ] **Step 5:** Commit `feat(api): in-memory blob stub, server entry, configurable rate limit`.

### Task 2: e2e-tests scaffolding and smoke test

**Files:**
- Create: `e2e-tests/requirements.txt` (pytest, pytest-playwright, pytest-html, pypdf, requests), `e2e-tests/pytest.ini`, `e2e-tests/conftest.py`, `e2e-tests/helpers.py`, `e2e-tests/test_smoke.py`
- Modify: `.gitignore` (add `e2e-tests/.venv`, `e2e-tests/screenshots`, `e2e-tests/report*.html`)

**Interfaces:**
- `conftest.py` produces: autouse session fixture `servers` starting the API (`npx tsx src/server.ts` with `BLOB_STUB=1 PORT=4000 FRONTEND_URL=http://localhost:3000 RATE_LIMIT_MAX=100000`) and the web app (`npm run build` then `npm run start` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`); waits on `GET /health` and `GET /`; terminates both at teardown. Constants `WEB = "http://localhost:3000"`, `API = "http://localhost:4000"`.
- `helpers.py` produces: `make_pdf(path: Path, pages: int) -> Path` (pypdf blank pages), `make_text_file(path: Path) -> Path`, `make_big_pdf(path: Path, size_mb: float = 4.5) -> Path` (valid PDF padded with trailing bytes).
- Hook `pytest_runtest_makereport` saves `screenshots/<browser>/<test-name>.png` after every test (pass or fail) and attaches it to pytest-html.
- `pytest.ini`: `addopts = --html=report.html --self-contained-html`.

- [ ] **Step 1: Write failing** `test_smoke.py::test_home_page_lists_three_tools`: open `WEB`, assert links to `/merge`, `/split`, `/organize` are visible.
- [ ] **Step 2:** `cd e2e-tests && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt && .venv/Scripts/playwright install chromium firefox webkit && .venv/Scripts/pytest test_smoke.py` -> FAIL until conftest exists.
- [ ] **Step 3:** Implement conftest/helpers as per Interfaces.
- [ ] **Step 4:** same pytest command -> PASS and a screenshot file exists.
- [ ] **Step 5:** Commit `test: scaffold playwright suite with server fixture`.

### Task 3: API CRUD endpoints and tests

**Files:**
- Create: `e2e-tests/test_api_crud.py`
- Modify: `apps/api/src/routes/pdf.routes.ts`, `apps/api/src/controllers/pdf.controller.ts`

**Interfaces:**
- Consumes: `stubStore` functions (Task 1), `uploadMiddleware.single("file")`.
- Produces handlers `handleGetFile`, `handlePutFile`, `handleDeleteFile` on `GET|PUT|DELETE /pdf/file?url=<key>`. Real mode: GET proxies the blob URL, PUT does `del`+`put`, DELETE does `del` (not exercised by tests).

- [ ] **Step 1: Write failing tests** with `requests` against `API`:
  - `test_create_upload_pdf_returns_200_and_url`: POST /pdf/upload valid PDF -> 200, body has `url`.
  - `test_read_uploaded_pdf_returns_200_and_unknown_returns_404`: GET url -> 200 with `application/pdf` content type; GET `/pdf/file?url=nope` -> 404; GET `/pdf/file` (no url) -> 400.
  - `test_update_pdf_returns_200_and_rejects_non_pdf`: PUT valid PDF -> 200 and GET returns new bytes; PUT .txt -> 400; PUT unknown key -> 404.
  - `test_delete_pdf_returns_200_then_404`: DELETE -> 200; GET same url -> 404; DELETE again -> 404.
- [ ] **Step 2:** `pytest test_api_crud.py` -> FAIL (404 on new routes).
- [ ] **Step 3:** Implement the three handlers and routes; 400 for missing `url`, 404 for unknown key, 400 for non-PDF mimetype.
- [ ] **Step 4:** `pytest test_api_crud.py` -> 4 PASS; `cd apps/api && npx vitest run` PASS.
- [ ] **Step 5:** Commit `feat(api): CRUD endpoints for stored files + API tests`.

### Task 4: Merge E2E (3 tests), `e2e-tests/test_e2e_merge.py`

- [ ] **Step 1: Write tests** (select files with `page.set_input_files("input[type=file]", [...])` on `/merge`):
  - `test_merge_two_pdfs_shows_ready_page`: upload 2 PDFs, click `Merge 2 files`, expect heading `Your merged PDF is ready` and text `2 files combined into one document.` (30s timeout).
  - `test_merge_button_disabled_with_single_file`: upload 1 PDF; Merge button disabled, text `Add one more file to merge.` visible.
  - `test_remove_file_from_queue_disables_merge`: upload 2, click the `Remove <name>` aria-label button, Merge button disabled again.
- [ ] **Step 2:** `pytest test_e2e_merge.py` -> 3 PASS on chromium. If selectors fail, fix the test (the app is the source of truth).
- [ ] **Step 3:** Commit `test: merge e2e tests`.

### Task 5: Split E2E (3 tests), `e2e-tests/test_e2e_split.py`

Use a 3-page PDF; upload on `/split`, wait for `File 1` text, fill `input[placeholder="1-3, 7"]`.
- [ ] **Step 1: Write tests:**
  - `test_split_full_range_creates_file`: fill `1-3`, click `Split`, expect `Your files are ready` and `1 file created.`
  - `test_split_empty_range_shows_error`: leave empty, click Split, expect `Enter at least one page or page range.`
  - `test_split_page_beyond_total_shows_error`: fill `99`, expect `Page 99 doesn't exist — this PDF has 3 pages.`
- [ ] **Step 2:** `pytest test_e2e_split.py` -> 3 PASS.
- [ ] **Step 3:** Commit `test: split e2e tests`.

### Task 6: Organize E2E (3 tests), `e2e-tests/test_e2e_organize.py`

3-page PDF on `/organize`; wait until the `Blank page` button is visible.
- [ ] **Step 1: Write tests:**
  - `test_add_blank_page_then_save`: click `Blank page` once, click `Save changes`, expect `Your reorganized PDF is ready` and `4 pages in the new file.`
  - `test_remove_one_page_then_save`: click the remove control on the first thumbnail (read `PageThumbnail.tsx` for its accessible name), save, expect `2 pages in the new file.`
  - `test_remove_all_pages_disables_save`: remove all 3, expect `Add at least one page to build a PDF.` and Save button disabled.
- [ ] **Step 2:** `pytest test_e2e_organize.py` -> 3 PASS.
- [ ] **Step 3:** Commit `test: organize e2e tests`.

### Task 7: Upload validation E2E (3 tests), `e2e-tests/test_e2e_upload.py`

Use the `/split` page (single-file dropzone).
- [ ] **Step 1: Write tests:**
  - `test_valid_pdf_is_accepted_and_previewed`: upload valid PDF, expect `Output files` heading visible, no `isn't a PDF` text.
  - `test_non_pdf_is_rejected`: upload `notes.txt` with `mime_type="text/plain"`, expect `"notes.txt" isn't a PDF file.`
  - `test_pdf_over_4mb_is_rejected`: `make_big_pdf(..., 4.5)`, expect text containing `is over the 4MB limit`.
- [ ] **Step 2:** `pytest test_e2e_upload.py` -> 3 PASS.
- [ ] **Step 3:** Commit `test: upload validation e2e tests`.

### Task 8: Network mocking (2 tests), `e2e-tests/test_network_mocking.py`

- [ ] **Step 1: Write tests** using `page.route(f"{API}/pdf/**", handler)` on the `/merge` flow with 2 PDFs:
  - `test_merge_handles_server_error`: fulfill upload with status 500 `{"error":"Failed to upload PDF."}`; expect `Failed to upload PDF.` visible, `Merge PDFs` heading still present, Merge button re-enabled.
  - `test_merge_handles_empty_response`: fulfill upload with 200 and `{}` (no `url`); assert the page does not reach the ready page and no uncaught page error (`page.on("pageerror")` collects none). If the app misbehaves, record it as a bug in `main.md` and ask the user whether to fix it.
- [ ] **Step 2:** `pytest test_network_mocking.py` -> 2 PASS (or documented bug).
- [ ] **Step 3:** Commit `test: network mocking tests`.

### Task 9: Cross-browser run and report

- [ ] **Step 1:** From `e2e-tests/`: `pytest --browser chromium --browser firefox --browser webkit`.
- [ ] **Step 2:** Expected: all tests PASS on all 3 browsers; fix flaky selectors/timeouts (never loosen assertions). Verify `report.html` and `screenshots/{chromium,firefox,webkit}/` exist.
- [ ] **Step 3:** Update `main.md`; commit `test: verified on chromium, firefox, webkit`.

### Task 10: Intentional bug demo

- [ ] **Step 1:** `git switch -c bug-demo`; in `apps/web/src/lib/ranges.ts` change `end1Based > totalPages` to `end1Based >= totalPages`.
- [ ] **Step 2:** `pytest test_e2e_split.py --browser chromium --html=report_bug.html --self-contained-html`. Expected: `test_split_full_range_creates_file` FAILS (error shown for `1-3`), the other split tests PASS. Keep the failure screenshots.
- [ ] **Step 3:** Run the full suite on chromium with the bug (`report_bug_full.html`) to show all results.
- [ ] **Step 4:** Commit on `bug-demo` only; `git switch main`; confirm `ranges.ts` is original.

### Task 11: Report and submission zip

**Files:** Create `REPORT.md` (repo root) and `submission.zip` (not committed).
- [ ] **Step 1:** Write `REPORT.md`: test-case table (ID, feature, type, steps, expected, result per browser); features tested (Merge, Split, Organize, Upload validation); features left out with reasons (landing page beyond smoke test, drag-and-drop reorder because it is flaky across browsers, real Vercel Blob because stubbed, rate limiting); bugs found (intentional off-by-one plus anything from Task 8); member split (Member A: Merge, Split, API; Member B: Organize, Upload, mocking; replace with real names when given).
- [ ] **Step 2:** Zip `e2e-tests/` (excluding `.venv`), reports, screenshots and `REPORT.md` into `submission.zip` with PowerShell `Compress-Archive`.
- [ ] **Step 3:** Update `main.md` with final status; ask the user for the partner's name.
