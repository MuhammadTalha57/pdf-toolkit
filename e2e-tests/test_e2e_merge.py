from playwright.sync_api import Page, expect

from conftest import WEB
from helpers import make_pdf


def _open_with_files(page: Page, tmp_path, count: int):
    files = [str(make_pdf(tmp_path / f"f{i}.pdf", 2)) for i in range(count)]
    page.goto(f"{WEB}/merge")
    page.set_input_files("input[type=file]", files)
    return files


def test_merge_two_pdfs_shows_ready_page(page: Page, tmp_path):
    _open_with_files(page, tmp_path, 2)
    page.get_by_role("button", name="Merge 2 files").click()
    expect(page.get_by_role("heading", name="Your merged PDF is ready")).to_be_visible(timeout=30000)
    expect(page.get_by_text("2 files combined into one document.")).to_be_visible()


def test_merge_button_disabled_with_single_file(page: Page, tmp_path):
    _open_with_files(page, tmp_path, 1)
    expect(page.get_by_role("button", name="Merge 1 files")).to_be_disabled()
    expect(page.get_by_text("Add one more file to merge.")).to_be_visible()


def test_remove_file_from_queue_disables_merge(page: Page, tmp_path):
    _open_with_files(page, tmp_path, 2)
    expect(page.get_by_role("button", name="Merge 2 files")).to_be_enabled()
    page.get_by_label("Remove f0.pdf").click()
    expect(page.get_by_role("button", name="Merge 1 files")).to_be_disabled()
