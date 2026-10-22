# Playwright (Python) Testing Suite for PDF Toolkit — Design

## Goal
University project: prove PDF Toolkit works across browsers with end-to-end, API and network-mock tests, and prove the tests catch a deliberately injected bug.

## Scope
- Features under test: **Merge, Split, Organize, Upload validation**.
- Target: local web (`apps/web`, :3000) + local API (`apps/api`, :4000) with `BLOB_STUB=1`. No Vercel token needed.
- Browsers: Chromium, Firefox, WebKit.

## Components
1. **API stub mode** (`apps/api`): when `BLOB_STUB=1`, `uploadBlob` writes to an in-memory Map and returns `http://localhost:4000/pdf/file?url=...`-style URLs; `readPDFFromURL` reads from the same Map for those URLs. Without the flag, behaviour is unchanged.
2. **CRUD endpoints** (`apps/api/src/routes/pdf.routes.ts`):
   - Create: `POST /pdf/upload` (existing)
   - Read: `GET /pdf/file?url=` -> 200 PDF bytes, 404 if unknown, 400 if `url` missing
   - Update: `PUT /pdf/file?url=` (multipart `file`) -> 200, 404 unknown, 400 non-PDF
   - Delete: `DELETE /pdf/file?url=` -> 200, 404 unknown
   In real mode these call `@vercel/blob` (`head`/`put`/`del`).
3. **Test suite** `e2e-tests/` (pytest + pytest-playwright + pytest-html + pypdf):
   - `conftest.py`: starts web+API, sample-PDF fixtures, screenshot-per-test hook.
   - `test_e2e_merge.py`, `test_e2e_split.py`, `test_e2e_organize.py`, `test_e2e_upload.py` — 3 tests each (12).
   - `test_api_crud.py` — 4 tests (C/R/U/D incl. 200/400/404).
   - `test_network_mocking.py` — 2 tests via `page.route`: empty response, 500 error; page must show an error and not crash.
4. **Intentional bug** on branch `bug-demo`: off-by-one in `apps/web/src/lib/ranges.ts` (`>` -> `>=`). Run shows failing tests; branch is not merged.
5. **Deliverables**: `submission.zip` = tests, `report.html`, `screenshots/`, `REPORT.md` (test-case table, features tested / left out + reasons, bugs, member work split; members as placeholders until named).

## Success criteria
- All 18 tests pass on 3 browsers on `main`.
- With the bug branch, at least the split range tests fail, with report + screenshots.
- Every test is simple enough for either member to explain.

## Risks
- Drag-and-drop in Organize may be flaky in WebKit -> use simple remove/blank-page actions for assertions.
- Next dev first-compile latency -> generous timeouts, run `next build && next start` if needed.
