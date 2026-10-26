from playwright.sync_api import Page, expect

from conftest import WEB
from helpers import make_pdf

RANGE_INPUT = 'input[placeholder="1-3, 7"]'


def _open_split(page: Page, tmp_path):
    page.goto(f"{WEB}/split")
    page.set_input_files("input[type=file]", str(make_pdf(tmp_path / "doc.pdf", 3)))
    expect(page.get_by_text("File 1")).to_be_visible(timeout=20000)


def test_split_full_range_creates_file(page: Page, tmp_path):
    _open_split(page, tmp_path)
    page.fill(RANGE_INPUT, "1-3")
    page.get_by_role("button", name="Split", exact=True).click()
    expect(page.get_by_role("heading", name="Your files are ready")).to_be_visible(timeout=30000)
    expect(page.get_by_text("1 file created.")).to_be_visible()


def test_split_empty_range_shows_error(page: Page, tmp_path):
    _open_split(page, tmp_path)
    page.get_by_role("button", name="Split", exact=True).click()
    expect(page.get_by_text("Enter at least one page or page range.")).to_be_visible()


def test_split_page_beyond_total_shows_error(page: Page, tmp_path):
    _open_split(page, tmp_path)
    page.fill(RANGE_INPUT, "99")
    page.get_by_role("button", name="Split", exact=True).click()
    expect(page.get_by_text("Page 99 doesn't exist — this PDF has 3 pages.")).to_be_visible()
