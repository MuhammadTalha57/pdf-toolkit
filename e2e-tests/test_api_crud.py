"""API tests: the four CRUD operations against the stubbed backend."""
import requests

from conftest import API
from helpers import make_pdf, make_text_file


def _upload(path):
    with open(path, "rb") as f:
        return requests.post(f"{API}/pdf/upload", files={"file": (path.name, f, "application/pdf")})


def test_create_upload_pdf_returns_200_and_url(tmp_path):
    res = _upload(make_pdf(tmp_path / "a.pdf", 1))
    assert res.status_code == 200
    assert res.json()["url"].startswith(API)


def test_read_uploaded_pdf_returns_200_and_unknown_returns_404(tmp_path):
    url = _upload(make_pdf(tmp_path / "a.pdf", 1)).json()["url"]
    res = requests.get(url)
    assert res.status_code == 200
    assert "application/pdf" in res.headers["content-type"]
    assert requests.get(f"{API}/pdf/file", params={"url": "nope"}).status_code == 404
    assert requests.get(f"{API}/pdf/file").status_code == 400


def test_update_pdf_returns_200_and_rejects_non_pdf(tmp_path):
    url = _upload(make_pdf(tmp_path / "a.pdf", 1)).json()["url"]
    key = url.split("url=")[1]
    new_pdf = make_pdf(tmp_path / "b.pdf", 2)
    with open(new_pdf, "rb") as f:
        res = requests.put(f"{API}/pdf/file", params={"url": key}, files={"file": ("b.pdf", f, "application/pdf")})
    assert res.status_code == 200
    assert requests.get(url).content == new_pdf.read_bytes()

    txt = make_text_file(tmp_path / "x.txt")
    with open(txt, "rb") as f:
        res = requests.put(f"{API}/pdf/file", params={"url": key}, files={"file": ("x.txt", f, "text/plain")})
    assert res.status_code == 400

    with open(new_pdf, "rb") as f:
        res = requests.put(f"{API}/pdf/file", params={"url": "nope"}, files={"file": ("b.pdf", f, "application/pdf")})
    assert res.status_code == 404


def test_delete_pdf_returns_200_then_404(tmp_path):
    url = _upload(make_pdf(tmp_path / "a.pdf", 1)).json()["url"]
    key = url.split("url=")[1]
    assert requests.delete(f"{API}/pdf/file", params={"url": key}).status_code == 200
    assert requests.get(url).status_code == 404
    assert requests.delete(f"{API}/pdf/file", params={"url": key}).status_code == 404
