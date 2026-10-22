"""Feature 4: Upload validation (PDF only, max 4MB), exercised through the Split dropzone."""
from playwright.sync_api import Page, expect

from conftest import WEB
from helpers import make_big_pdf, make_pdf, make_text_file


def test_valid_pdf_is_accepted_and_previewed(page: Page, tmp_path):
    page.goto(f"{WEB}/split")
    page.set_input_files("input[type=file]", str(make_pdf(tmp_path / "ok.pdf", 2)))
    expect(page.get_by_role("heading", name="Output files")).to_be_visible(timeout=20000)
    expect(page.get_by_text("isn't a PDF")).to_have_count(0)


def test_non_pdf_is_rejected(page: Page, tmp_path):
    page.goto(f"{WEB}/split")
    txt = make_text_file(tmp_path / "notes.txt")
    page.set_input_files(
        "input[type=file]",
        files=[{"name": "notes.txt", "mimeType": "text/plain", "buffer": txt.read_bytes()}],
    )
    expect(page.get_by_text('"notes.txt" isn\'t a PDF file.')).to_be_visible()


def test_pdf_over_4mb_is_rejected(page: Page, tmp_path):
    page.goto(f"{WEB}/split")
    page.set_input_files("input[type=file]", str(make_big_pdf(tmp_path / "big.pdf", 4.5)))
    expect(page.get_by_text("is over the 4MB limit")).to_be_visible()
