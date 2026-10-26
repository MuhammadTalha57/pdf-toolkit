# Demo Guide: har file aur har test ka matlab

Ye guide demo (viva) ke liye hai. Har test ke saath likha hai: **kya karta hai**, **kyun zaroori hai**, aur **kya bolna hai**.

## 0. Big picture (30 second ka jawab)

- Humne **PDF Toolkit** test ki: website jo PDFs merge, split aur organize karti hai.
- Tests **Python + Playwright + pytest** mein hain. Playwright asli browser (Chromium, Firefox, WebKit) khol ke user ki tarah click aur type karta hai.
- Backend ko asli cloud storage (Vercel Blob) ki jagah **in-memory stub** par chalaya (`BLOB_STUB=1`), taake token ke bagair tests tez aur stable chalen.
- Total: **12 E2E + 4 API + 2 network-mock + 1 smoke**. Result: 3 browsers par **49 passed**.
- Humne jaan boojh kar ek bug daala (`>=` instead of `>`), aur ek test fail hua. Matlab tests asli problems pakadte hain.

### Shabdon ka matlab
| Term | Matlab |
|---|---|
| **E2E test** | Browser mein poora user flow chalana (upload, click, result dekhna) |
| **API test** | Browser ke bagair seedha server ko HTTP request bhejna aur status code check karna |
| **Positive test** | Sahi input par sahi kaam hota hai |
| **Negative test** | Ghalat ya khali input par achha error aata hai |
| **Network mocking** | Server ka jawab jaali (fake) bana dena taake dekhen page toot'ta to nahi |
| **Fixture** | pytest ka tayyari wala code (jaise servers start karna) |
| **Locator / selector** | Page par koi element dhoondne ka tareeqa (button ka naam, text, etc.) |
| **expect(...)** | Playwright ki assertion; ye automatically thodi der intezar karti hai jab tak shart poori ho |

---

## 1. Support files

### `conftest.py` (tayyari)
- `servers` fixture (autouse, session): test shuru hone se pehle **API (port 4000)** aur **web app (port 3000)** start karta hai, `/health` aur home page ka intezar karta hai, aur end par dono band kar deta hai. Pehli baar web app **build** hoti hai (~3 min); `SKIP_BUILD=1` se dobara build chhod sakte hain.
- API ko env milta hai: `BLOB_STUB=1` (stub storage), `RATE_LIMIT_MAX=100000` (taake 100 request ki limit tests na roke).
- `pytest_runtest_makereport` hook: **har test ke baad screenshot** leta hai (`screenshots/<browser>/<test>.png`) aur HTML report mein embed karta hai.
- Constants: `WEB = http://localhost:3000`, `API = http://localhost:4000`.

### `helpers.py` (sample files banane wale)
- `make_pdf(path, pages)`: `pypdf` se asli khali-page PDF.
- `make_text_file(path)`: ek `.txt` file (PDF nahi).
- `make_big_pdf(path, 4.5)`: valid PDF jis ke aakhir mein extra bytes laga ke 4.5MB kar diya (limit 4MB hai).

### `pytest.ini`
- Har run par `report.html` (self-contained) banata hai.

---

## 2. E2E tests (12)

Sab tests mein file upload aise hota hai: `page.set_input_files("input[type=file]", ...)`. Dropzone ka asli input chhupa hota hai, isliye hum use seedha file dete hain.

### Feature 1: Merge (`test_e2e_merge.py`)

| Test | Kya karta hai | Kyun zaroori |
|---|---|---|
| `test_merge_two_pdfs_shows_ready_page` (**positive**) | 2 PDFs upload, "Merge 2 files" click. Dekhta hai "Your merged PDF is ready" aur "2 files combined into one document." | Asli kaam: upload, merge, result ka poora raasta chalta hai |
| `test_merge_button_disabled_with_single_file` (**negative**) | Sirf 1 file daalta hai. Merge button disabled aur hint "Add one more file to merge." | Ghalat input (1 file) se merge nahi hona chahiye |
| `test_remove_file_from_queue_disables_merge` (**negative**) | 2 files daalta hai (button enabled), ek hata deta hai (`Remove f0.pdf`), button phir disabled | UI state sahi update hoti hai |

**Bolna:** "Merge ka button tab hi chalta hai jab kam az kam 2 files hon. Pehla test khushi ka raasta hai, baaki do galat/kam input check karte hain."

### Feature 2: Split (`test_e2e_split.py`)

Helper `_open_split`: `/split` kholta hai, 3 page ki PDF daalta hai, "File 1" dikhne ka intezar karta hai (matlab page previews load ho gaye). Range box ka placeholder `1-3, 7` hai.

| Test | Kya karta hai | Kyun zaroori |
|---|---|---|
| `test_split_full_range_creates_file` (**positive**) | Range `1-3` likhta hai, Split dabata hai. "Your files are ready" aur "1 file created." | Boundary (aakhri page) sahi chalti hai. **Isi test ne intentional bug pakda.** |
| `test_split_empty_range_shows_error` (**negative**) | Kuch likhe bagair Split. Error: "Enter at least one page or page range." | Khali input handle hota hai |
| `test_split_page_beyond_total_shows_error` (**negative**) | Range `99` (PDF mein sirf 3 pages). Error: "Page 99 doesn't exist, this PDF has 3 pages." | Out-of-range input handle hota hai |

**Bolna:** "Range ki jaanch frontend mein `parsePageRanges` karta hai (`ranges.ts`). Hum ne usi mein bug daala."

### Feature 3: Organize (`test_e2e_organize.py`)

Helper `_open_organize`: `/organize` par 3 page ki PDF, "Blank page" button dikhne tak intezar.

| Test | Kya karta hai | Kyun zaroori |
|---|---|---|
| `test_add_blank_page_then_save` (**positive**) | "Blank page" click, "Save changes". Result: "4 pages in the new file." | 3 + 1 blank = 4, poora raasta server tak chalta hai |
| `test_remove_one_page_then_save` (**positive**) | Page 1 ka remove button (`Remove 1`) click, save. Result: "2 pages in the new file." | Page hatana kaam karta hai |
| `test_remove_all_pages_disables_save` (**negative**) | Teeno pages hata deta hai. Hint "Add at least one page to build a PDF." aur Save disabled | Khali PDF nahi banni chahiye |

**Note:** Remove button sirf hover par nazar aata hai, isliye `click(force=True)` use hua. Drag-and-drop test nahi kiya kyunke wo Firefox/WebKit mein flaky hota hai.

### Feature 4: Upload validation (`test_e2e_upload.py`)

Ye `/split` ke dropzone se test hota hai (dropzone mein wahi rules hain: sirf PDF, max 4MB).

| Test | Kya karta hai | Kyun zaroori |
|---|---|---|
| `test_valid_pdf_is_accepted_and_previewed` (**positive**) | Sahi PDF daalta hai. "Output files" heading aati hai, "isn't a PDF" nahi | Sahi file qabool hoti hai |
| `test_non_pdf_is_rejected` (**negative**) | `notes.txt` (mime `text/plain`). Error: `"notes.txt" isn't a PDF file.` | Ghalat type reject hoti hai |
| `test_pdf_over_4mb_is_rejected` (**negative**) | 4.5MB PDF. Error mein "is over the 4MB limit" | Size limit lagti hai |

---

## 3. API tests (4), `test_api_crud.py`

Ye browser nahi kholte; `requests` library se seedha server (`localhost:4000`) ko bulate hain. API mein pehle sirf POST endpoints thay, isliye humne `/pdf/file` par **GET / PUT / DELETE** add kiye.

| CRUD | Test | Kya check hota hai |
|---|---|---|
| **Create** | `test_create_upload_pdf_returns_200_and_url` | `POST /pdf/upload` par PDF bhejo, **200** aur `url` wapas |
| **Read** | `test_read_uploaded_pdf_returns_200_and_unknown_returns_404` | `GET` us url par **200** aur `application/pdf`; galat key par **404**; key ke bagair **400** |
| **Update** | `test_update_pdf_returns_200_and_rejects_non_pdf` | `PUT` se file badalna **200** (phir GET naya content deta hai); `.txt` bhejna **400**; galat key **404** |
| **Delete** | `test_delete_pdf_returns_200_then_404` | `DELETE` **200**; phir GET **404**; dobara DELETE **404** |

**Status codes yaad rakhein:** 200 = theek, 400 = request ghalat, 404 = cheez maujood nahi.
**Bolna:** "Assignment ka example tha 200 asli page ke liye aur 404 missing ke liye. Wahi har endpoint par check kiya."

---

## 4. Network mocking (2), `test_network_mocking.py`

Idea: `page.route(...)` browser aur server ke beech aa kar jawab **khud** bana deta hai.

| Test | Mock | Kya check hota hai |
|---|---|---|
| `test_merge_handles_server_error` | Upload par **500** `{"error":"Failed to upload PDF."}` | Error text dikhta hai, "Merge PDFs" heading qaim, Merge button dobara enabled |
| `test_merge_handles_empty_response` | Har `/pdf/**` par **200** `{}` (khali data) | Koi JavaScript error nahi (`pageerror` khali), "ready" page nahi aata, page toot'ta nahi |

**Bolna (honest):** "Dusre test se humne ek asli kamzori payi: khali jawab par app crash nahi hoti, lekin user ko koi message bhi nahi dikhta. REPORT.md mein Bug 2 hai."

---

## 5. Smoke test (1), `test_smoke.py`

- `test_home_page_lists_three_tools`: home page par `/merge`, `/split`, `/organize` ke links maujood hain. Sab se saada check ke app khadi hui.

---

## 6. Intentional bug demo

- **Kya badla:** `apps/web/src/lib/ranges.ts` mein `end1Based > totalPages` ko `end1Based >= totalPages`.
- **Asar:** 3 page ki PDF mein page "3" ko "doesn't exist" kaha jata hai.
- **Kaun sa test fail hua:** `test_split_full_range_creates_file` (range `1-3`).
- **`test_split_page_beyond_total_shows_error` (99) kyun pass raha?** Kyunke 99 dono tarah out-of-range hai. Sirf boundary wala test bug pakadta hai. Isi liye boundary test likhna zaroori hai.
- **Dikhane ke liye:** branch `bug-demo`, `report_bug.html` (1 failed, 18 passed), screenshot `screenshots_bug/chromium/test_split_full_range_creates_file.png`.

---

## 7. Live demo ka tareeqa

```
cd e2e-tests
.venv\Scripts\pytest --browser chromium --browser firefox --browser webkit
```
- Pehli baar ~3 min build, phir ~3.5 min run. Agar waqt kam ho: `set SKIP_BUILD=1` aur sirf `--browser chromium` (~1 min).
- Ek test dekhne ke liye: `pytest test_e2e_split.py --browser chromium --headed --slowmo 500`
- Bug dikhane ke liye: `git switch bug-demo`, `pytest test_e2e_split.py --browser chromium`, phir `git switch playwright-tests`.

## 8. Mumkin sawal aur jawab

1. **Stub kyun?** Asli Vercel Blob ko token chahiye aur internet; stub se tests tez aur repeatable hain, baqi code path wahi hai.
2. **Teeno browsers kyun?** Har browser ka engine alag hai (Chromium/Blink, Firefox/Gecko, WebKit/Safari); ek mein chal jaye to doosre mein toot sakta hai.
3. **`expect` aur `assert` mein farq?** `expect` Playwright ka hai aur intezar karta hai (page async load hota hai); `assert` foran check karta hai (API tests mein theek hai).
4. **Screenshot har test ke baad kyun?** Saboot ke liye; report mein embed hote hain.
5. **API tests 3 baar kyun nahi chale?** Wo browser use nahi karte, isliye pytest unhein ek hi baar chalata hai (49 = 15x3 + 4).
6. **Rate limit kyun badhaya?** API mein 100 requests/15 min ki limit thi; 3 browsers ke tests us se zyada requests bhejte, isliye test run mein `RATE_LIMIT_MAX` bada kiya.
7. **Kya reh gaya?** Drag-and-drop, asli cloud storage, download ka asli file content. Wajah REPORT.md mein hai.
