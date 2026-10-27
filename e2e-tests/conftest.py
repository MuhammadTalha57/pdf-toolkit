import base64
import os
import re
import time
from pathlib import Path

import pytest
import requests
from playwright.sync_api import expect

WEB = os.environ.get("WEB_URL", "https://pdf-toolkit-web-orcin.vercel.app").rstrip("/")
API = os.environ.get("API_URL", "").rstrip("/")
SHOT_DIR = Path(os.environ.get("SHOT_DIR", Path(__file__).parent / "screenshots"))

expect.set_options(timeout=30000)   # deployed app is slower (cold starts, real storage)


def _wait_for(url: str, timeout: int = 90):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if requests.get(url, timeout=10).status_code < 500:
                return
        except requests.RequestException:
            pass
        time.sleep(2)
    raise RuntimeError(f"{url} did not respond within {timeout}s")


@pytest.fixture(scope="session", autouse=True)
def servers():
    """Deployed app: nothing to start, just check both sites are up."""
    if not API:
        raise RuntimeError("Set API_URL to your deployed API, e.g. https://xxx.vercel.app")
    _wait_for(f"{API}/health")
    _wait_for(WEB)
    yield


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when != "call":
        return
    page = item.funcargs.get("page")
    if page is None:
        return
    browser = item.funcargs.get("browser_name", "browser")
    path = SHOT_DIR / browser / (re.sub(r"\[.*\]", "", item.name) + ".png")
    path.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(path))
    pytest_html = item.config.pluginmanager.getplugin("html")
    if pytest_html:
        extra = getattr(report, "extras", [])
        extra.append(pytest_html.extras.image(base64.b64encode(path.read_bytes()).decode()))
        report.extras = extra