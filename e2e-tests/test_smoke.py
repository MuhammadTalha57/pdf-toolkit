from playwright.sync_api import Page, expect

from conftest import WEB


def test_home_page_lists_three_tools(page: Page):
    page.goto(WEB)
    for href in ("/merge", "/split", "/organize"):
        expect(page.locator(f'a[href="{href}"]').first).to_be_visible()
