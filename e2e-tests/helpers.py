"""Sample-file builders for the tests."""
from pathlib import Path

from pypdf import PdfWriter


def make_pdf(path: Path, pages: int = 3) -> Path:
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=200, height=200)
    with open(path, "wb") as f:
        writer.write(f)
    return path


def make_text_file(path: Path) -> Path:
    path.write_text("this is not a pdf")
    return path


def make_big_pdf(path: Path, size_mb: float = 4.5) -> Path:
    """A valid PDF padded with trailing bytes so it exceeds the 4MB limit."""
    make_pdf(path, 1)
    with open(path, "ab") as f:
        f.write(b"\n%" + b"0" * int(size_mb * 1024 * 1024))
    return path
