"""API tests: the four CRUD operations against the deployed API."""
import requests

from conftest import API
from helpers import make_pdf, make_text_file

FILE = f"{API}/pdf/file"


def _upload(path):
    with open(path, "rb") as f:
        return requests.post(f"{API}/pdf/upload", files={"file": (path.name, f, "application/pdf")}, timeout=60)


def _key(url):
    # real mode: the blob URL itself; stub mode: ".../pdf/file?url=<key>"
    return url.split("url=")[1] if "/pdf/file?url=" in url else url


def _get(key):
    return requests.get(FILE, params={"url": key}, timeout=60)


def test_create_upload_pdf_returns_200_and_url(tmp_path):
    res = _upload(make_pdf(tmp_path / "a.pdf", 1))
    assert res.status_code == 200
    assert res.json()["url"].startswith("http")


def test_read_uploaded_pdf_returns_200_and_unknown_returns_404(tmp_path):
    key = _key(_upload(make_pdf(tmp_path / "a.pdf", 1)).json()["url"])
    res = _get(key)
    assert res.status_code == 200
    assert "application/pdf" in res.headers["content-type"]
    assert _get("https://example.com/nope.pdf").status_code == 404
    assert requests.get(FILE, timeout=60).status_code == 400


def test_update_pdf_returns_200_and_rejects_non_pdf(tmp_path):
    key = _key(_upload(make_pdf(tmp_path / "a.pdf", 1)).json()["url"])
    new_pdf = make_pdf(tmp_path / "b.pdf", 2)

    # Updating a.pdf with b.pdf
    with open(new_pdf, "rb") as f:
        res = requests.put(FILE, params={"url": key}, files={"file": ("b.pdf", f, "application/pdf")}, timeout=60)
    assert res.status_code == 200
    new_key = res.json().get("url", key)      # real mode returns a new url
    assert _get(new_key).content == new_pdf.read_bytes()

    # Replacing .pdf with .txt
    txt = make_text_file(tmp_path / "x.txt")
    with open(txt, "rb") as f:
        res = requests.put(FILE, params={"url": new_key}, files={"file": ("x.txt", f, "text/plain")}, timeout=60)
    assert res.status_code == 400

    # Updating non existent file
    with open(new_pdf, "rb") as f:
        res = requests.put(FILE, params={"url": "https://example.com/nope.pdf"},
                           files={"file": ("b.pdf", f, "application/pdf")}, timeout=60)
    assert res.status_code == 404


def test_delete_pdf_returns_200_then_404(tmp_path):
    key = _key(_upload(make_pdf(tmp_path / "a.pdf", 1)).json()["url"])
    assert requests.delete(FILE, params={"url": key}, timeout=60).status_code == 200
    assert _get(key).status_code == 404
    assert requests.delete(FILE, params={"url": key}, timeout=60).status_code == 404