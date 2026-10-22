# PDF Toolkit: Playwright (Python) Test Report

**Team:** Member A (name to be filled), Member B (name to be filled)
**Site under test:** PDF Toolkit (Next.js frontend + Express API), run locally with a stubbed file store (`BLOB_STUB=1`), so no cloud token is needed.
**Tools:** Python 3.12, pytest, pytest-playwright, pytest-html, pypdf, requests.
**Browsers:** Chromium, Firefox, WebKit.

## Results at a glance

| Run | Result | Evidence |
|---|---|---|
| Clean code, 3 browsers | **49 passed, 0 failed** | `report_all_pass.html`, `screenshots_pass/` |
| Intentional bug, Chromium | **1 failed, 18 passed** | `report_bug.html`, `screenshots_bug/` |

49 = 15 browser tests x 3 browsers + 4 API tests (the API tests do not use a browser, so they run once).

## Features tested

1. **Merge:** combine PDFs in order.
2. **Split:** extract page ranges into new files (includes range validation).
3. **Organize:** add blank page, remove pages, save.
4. **Upload validation:** PDF-only and 4MB limit in the dropzone.

### Left out (with reasons)
- **Drag-and-drop reordering (Merge and Organize):** HTML5 drag events are flaky across Firefox and WebKit in Playwright; we test add/remove instead.
- **Real Vercel Blob storage:** needs a paid cloud token; the stub covers the same code path in the API.
- **Download button / file contents:** the download is a browser-level save; we check the "ready" page instead.
- **Rate limiting (100 requests / 15 min):** raised via `RATE_LIMIT_MAX` for the test run; not itself tested.
- **Landing page:** one smoke test only (links to the three tools exist).

## Test case table

| ID | Feature | Type | Test (file::name) | Expected | Result (Chromium / Firefox / WebKit) |
|---|---|---|---|---|---|
| E1 | Merge | Positive | test_e2e_merge::test_merge_two_pdfs_shows_ready_page | Two PDFs merge; "Your merged PDF is ready" and "2 files combined" shown | Pass / Pass / Pass |
| E2 | Merge | Negative | test_e2e_merge::test_merge_button_disabled_with_single_file | One file: Merge disabled, hint "Add one more file to merge." | Pass / Pass / Pass |
| E3 | Merge | Negative | test_e2e_merge::test_remove_file_from_queue_disables_merge | Removing one of two files disables Merge | Pass / Pass / Pass |
| E4 | Split | Positive | test_e2e_split::test_split_full_range_creates_file | Range `1-3` on a 3-page PDF gives "Your files are ready", "1 file created." | Pass / Pass / Pass |
| E5 | Split | Negative | test_e2e_split::test_split_empty_range_shows_error | Empty range shows "Enter at least one page or page range." | Pass / Pass / Pass |
| E6 | Split | Negative | test_e2e_split::test_split_page_beyond_total_shows_error | `99` shows "Page 99 doesn't exist, this PDF has 3 pages." | Pass / Pass / Pass |
| E7 | Organize | Positive | test_e2e_organize::test_add_blank_page_then_save | Blank page added, saved file has 4 pages | Pass / Pass / Pass |
| E8 | Organize | Positive | test_e2e_organize::test_remove_one_page_then_save | One page removed, saved file has 2 pages | Pass / Pass / Pass |
| E9 | Organize | Negative | test_e2e_organize::test_remove_all_pages_disables_save | All pages removed: Save disabled, hint shown | Pass / Pass / Pass |
| E10 | Upload | Positive | test_e2e_upload::test_valid_pdf_is_accepted_and_previewed | Valid PDF accepted, page previews shown | Pass / Pass / Pass |
| E11 | Upload | Negative | test_e2e_upload::test_non_pdf_is_rejected | `.txt` rejected: "notes.txt isn't a PDF file." | Pass / Pass / Pass |
| E12 | Upload | Negative | test_e2e_upload::test_pdf_over_4mb_is_rejected | 4.5MB PDF rejected with "over the 4MB limit" | Pass / Pass / Pass |
| A1 | API Create | Positive | test_api_crud::test_create_upload_pdf_returns_200_and_url | `POST /pdf/upload` returns 200 and a url | Pass |
| A2 | API Read | Pos + Neg | test_api_crud::test_read_uploaded_pdf_returns_200_and_unknown_returns_404 | `GET /pdf/file` returns 200 PDF; unknown key 404; missing key 400 | Pass |
| A3 | API Update | Pos + Neg | test_api_crud::test_update_pdf_returns_200_and_rejects_non_pdf | `PUT` replaces the file (200); non-PDF 400; unknown key 404 | Pass |
| A4 | API Delete | Pos + Neg | test_api_crud::test_delete_pdf_returns_200_then_404 | `DELETE` 200; then GET 404; second DELETE 404 | Pass |
| M1 | Mock | Negative | test_network_mocking::test_merge_handles_server_error | Upload mocked as 500: error message shown, page intact, button re-enabled | Pass / Pass / Pass |
| M2 | Mock | Negative | test_network_mocking::test_merge_handles_empty_response | Server mocked to return `{}`: no crash, no JS error, ready page not shown | Pass / Pass / Pass |
| S1 | Smoke | Positive | test_smoke::test_home_page_lists_three_tools | Home page links to Merge, Split, Organize | Pass / Pass / Pass |

## Bugs

### Bug 1: intentional (to prove the tests catch problems)
- **Where:** `apps/web/src/lib/ranges.ts`, page-range validation. Changed `end1Based > totalPages` to `end1Based >= totalPages`.
- **Effect:** The last page of every PDF is wrongly rejected ("Page 3 doesn't exist, this PDF has 3 pages.").
- **Caught by:** E4 `test_split_full_range_creates_file` (fails; the page shows the error instead of "Your files are ready"). Run: 1 failed, 18 passed.
- **Where to see it:** branch `bug-demo`, `report_bug.html`, `screenshots_bug/chromium/test_split_full_range_creates_file.png`. The bug is not on the main test branch.
- **Note:** E6 (`99`) still passes under this bug because 99 is out of range either way, so only the boundary case catches it.

### Bug 2: found while writing the mock test (real, not fixed)
- **Where:** Merge page (`apps/web/src/app/(tools)/merge/page.tsx`, `handleMerge`).
- **What:** If the server answers 200 with a body that has no `url` (for example `{}`), the app does not crash, but it also shows **no message at all**: the button just stops spinning and nothing happens.
- **Expected:** An error such as "Something went wrong merging your files."
- **Test:** M2 documents the current behaviour (no crash, no ready page).

### Other
- `apps/api/src/server.ts` was missing from the repo (the README tells you to add it), so `npm run dev` for the API could not start. We added it.

## Who did what

| Member | Part |
|---|---|
| Member A | Test setup (conftest, helpers), Merge E2E (E1 to E3), Split E2E (E4 to E6), API CRUD tests (A1 to A4) |
| Member B | Organize E2E (E7 to E9), Upload validation E2E (E10 to E12), network mocking (M1, M2), intentional-bug demo, cross-browser run |

(Replace "Member A/B" with real names. Both members should be able to explain every test.)

## How to run

```
cd e2e-tests
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\playwright install chromium firefox webkit
.venv\Scripts\pytest --browser chromium --browser firefox --browser webkit
```
The first run builds the web app (about 3 minutes). Set `SKIP_BUILD=1` to reuse the build.
