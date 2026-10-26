from playwright.sync_api import Page, expect

from conftest import API, WEB
from helpers import make_pdf


def _queue_two_files(page: Page, tmp_path):
    files = [str(make_pdf(tmp_path / f"f{i}.pdf", 1)) for i in range(2)]
    page.goto(f"{WEB}/merge")
    page.set_input_files("input[type=file]", files)


def test_merge_handles_server_error(page: Page, tmp_path):
    page.route(
        f"{API}/pdf/upload",
        lambda route: route.fulfill(status=500, content_type="application/json",
                                    body='{"error":"Failed to upload PDF."}'),
    )
    _queue_two_files(page, tmp_path)
    page.get_by_role("button", name="Merge 2 files").click()
    expect(page.get_by_text("Failed to upload PDF.")).to_be_visible()
    expect(page.get_by_role("heading", name="Merge PDFs")).to_be_visible()
    expect(page.get_by_role("button", name="Merge 2 files")).to_be_enabled()


def test_merge_handles_empty_response(page: Page, tmp_path):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.route(
        f"{API}/pdf/**",
        lambda route: route.fulfill(status=200, content_type="application/json", body="{}"),
    )
    _queue_two_files(page, tmp_path)
    page.get_by_role("button", name="Merge 2 files").click()
    page.wait_for_timeout(2000)
    assert errors == []
    expect(page.get_by_role("heading", name="Your merged PDF is ready")).to_have_count(0)
    expect(page.get_by_role("heading", name="Merge PDFs")).to_be_visible()
