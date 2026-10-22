"""Feature 3: Organize pages (add blank, remove)."""
from playwright.sync_api import Page, expect

from conftest import WEB
from helpers import make_pdf


def _open_organize(page: Page, tmp_path):
    page.goto(f"{WEB}/organize")
    page.set_input_files("input[type=file]", str(make_pdf(tmp_path / "doc.pdf", 3)))
    expect(page.get_by_role("button", name="Blank page")).to_be_visible(timeout=20000)


def test_add_blank_page_then_save(page: Page, tmp_path):
    _open_organize(page, tmp_path)
    page.get_by_role("button", name="Blank page").click()
    page.get_by_role("button", name="Save changes").click()
    expect(page.get_by_role("heading", name="Your reorganized PDF is ready")).to_be_visible(timeout=30000)
    expect(page.get_by_text("4 pages in the new file.")).to_be_visible()


def test_remove_one_page_then_save(page: Page, tmp_path):
    _open_organize(page, tmp_path)
    page.get_by_label("Remove 1", exact=True).click(force=True)
    page.get_by_role("button", name="Save changes").click()
    expect(page.get_by_text("2 pages in the new file.")).to_be_visible(timeout=30000)


def test_remove_all_pages_disables_save(page: Page, tmp_path):
    _open_organize(page, tmp_path)
    for _ in range(3):
        page.get_by_label("Remove 1", exact=True).click(force=True)
    expect(page.get_by_text("Add at least one page to build a PDF.")).to_be_visible()
    expect(page.get_by_role("button", name="Save changes")).to_be_disabled()
