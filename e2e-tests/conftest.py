import base64
import os
import re
import subprocess
import time
from pathlib import Path

import pytest
import requests

ROOT = Path(__file__).resolve().parent.parent
WEB = "http://localhost:3000"
API = "http://localhost:4000"
SHOT_DIR = Path(os.environ.get("SHOT_DIR", Path(__file__).parent / "screenshots"))


def _wait_for(url: str, timeout: int = 180):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if requests.get(url, timeout=2).status_code < 500:
                return
        except requests.RequestException:
            pass
        time.sleep(1)
    raise RuntimeError(f"{url} did not come up within {timeout}s")


def _kill(proc: subprocess.Popen):
    
    subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)


@pytest.fixture(scope="session", autouse=True)
def servers():
    api_env = {
        **os.environ,
        "BLOB_STUB": "1",
        "PORT": "4000",
        "FRONTEND_URL": WEB,
        "RATE_LIMIT_MAX": "100000",
    }
    web_env = {**os.environ, "NEXT_PUBLIC_API_BASE_URL": API}

    api = subprocess.Popen("npx tsx src/server.ts", cwd=ROOT / "apps" / "api", env=api_env, shell=True)
    if os.environ.get("SKIP_BUILD") != "1":
        subprocess.run("npm run build", cwd=ROOT / "apps" / "web", env=web_env, shell=True, check=True)
    web = subprocess.Popen("npm run start", cwd=ROOT / "apps" / "web", env=web_env, shell=True)
    try:
        _wait_for(f"{API}/health")
        _wait_for(WEB)
        yield
    finally:
        _kill(web)
        _kill(api)


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
