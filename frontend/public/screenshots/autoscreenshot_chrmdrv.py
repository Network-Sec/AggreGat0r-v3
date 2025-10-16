#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
autoscreenshot_chrmdrv.py

* Landscape (1920×1200) + full‑page screenshots
* IP:domain lines are handled directly – no DNS lookup
* Code is NOT production ready yet
"""

import argparse
import json 
import requests
import os
import sys, shutil
from typing import List, Optional, Tuple

from selenium import webdriver
from selenium.common.exceptions import WebDriverException, TimeoutException, SessionNotCreatedException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

from PIL import Image
from io import BytesIO

from webdriver_manager.chrome import ChromeDriverManager

# -------------------------------------------------------------
# Configuration
# -------------------------------------------------------------
BASE_DIR_WINDOWS = "./"
CHROMEDRIVER_PATH = os.path.join(BASE_DIR_WINDOWS, "chromedriver.exe")
SCREENSHOT_DIR = ""
IP_PORTS = [80, 443, 4433, 4443, 8080, 8081, 8181, 8282, 8443, 5601, 5900, 9200]
EXCLUDE_DOMAINS = {
    "github.com",
    "google.com",        
    "facebook.com",
    "twitter.com",
    "microsoft.com",
    "apple.com",
    "amazon.com",
    "netflix.com",
    "yahoo.com",
    "bing.com"
}
# -------------------------------------------------------------
# Helpers
# -------------------------------------------------------------
def get_domain_list(arg: str) -> list[str]:
    """Return a list of items – file or comma‑separated string."""
    if os.path.isfile(arg):
        with open(arg, "r", encoding="utf-8") as f:
            return [line.strip() for line in f if line.strip()]
    return [d.strip() for d in arg.split(",") if d.strip()]

def get_chromedriver_path() -> str:
    # Directory where we keep the driver and the zip
    cwd = os.getcwd()

    # ----- 1️⃣  Try webdriver‑manager ---------------------------------
    if ChromeDriverManager is not None:
        try:
            driver_path = ChromeDriverManager().install()
            if os.path.exists(driver_path):
                # If the driver lives somewhere else, copy it into cwd
                if os.path.abspath(driver_path) != os.path.join(cwd, "chromedriver.exe"):
                    shutil.copy2(driver_path, os.path.join(cwd, "chromedriver.exe"))
                return os.path.join(cwd, "chromedriver.exe")
        except Exception as e:          # pragma: no cover
            print(f"⚠️  webdriver‑manager failed: {e}")

    # ----- 2️⃣  Manual download (old logic) ----------------------------
    try:
        driver_path = os.path.join(cwd, "chromedriver.exe")
        if not os.path.exists(driver_path):
            raise RuntimeError("Could not find chromedriver in extracted zip")

        return driver_path

    except Exception as e:
        raise RuntimeError(f"Could not download chromedriver: {e}")

MZ_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"
)

def get_domain_list(file_path: str):
    """Reads a file and returns a list of non-empty lines."""
    if not os.path.exists(file_path):
        print(f"❌ Error: Input file not found at '{file_path}'")
        sys.exit(1)
    with open(file_path, "r") as f:
        return [line.strip() for line in f if line.strip()]
    
def create_driver() -> webdriver.Chrome:
    """Build a stealth, head‑less Chrome driver."""
    driver_path = get_chromedriver_path()
    chrome_options = Options()

    # Stealth & anti‑automation flags
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)
    chrome_options.add_experimental_option("prefs", {
        "profile.default_content_setting_values.notifications": 2,
        "profile.default_content_setting_values.popups": 2,
        "profile.default_content_setting_values.geolocation": 2,
        "credentials_enable_service": False,
        "profile.password_manager_enabled": False,
    })

    # SSL & insecure content
    chrome_options.add_argument("--ignore-certificate-errors")
    chrome_options.add_argument("--allow-running-insecure-content")

    # Headless + default viewport (will be overridden)
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--window-size=2160,2160")

    # Quiet Chrome
    chrome_options.add_experimental_option("excludeSwitches", ["enable-logging"])
    chrome_options.add_argument("--silent")
    chrome_options.add_argument("--log-level=3")

    service = Service(driver_path)
    try:
        driver = webdriver.Chrome(service=service, options=chrome_options)
    except SessionNotCreatedException as exc:
        raise RuntimeError(f"ChromeDriver error: {exc}") from exc

    # Add custom headers
    driver.execute_cdp_cmd("Network.setExtraHTTPHeaders", {
        "headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive",
            "Referer": "https://www.google.com/",
            "Upgrade-Insecure-Requests": "1",
        }
    })

    # Hide webdriver flag
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """
    })

    driver.set_page_load_timeout(5)
    return driver

def take_fullpage_screenshot(driver: webdriver.Chrome, save_path: str,
                             max_height: int = 4000, quality: int = 95) -> None:
    """Full‑page JPEG screenshot (height capped)."""
    total_height = driver.execute_script(
        "return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);"
    )
    total_height = min(total_height, max_height)
    current_width = driver.execute_script("return window.innerWidth;")
    driver.set_window_size(current_width, total_height)
    png_bytes = driver.get_screenshot_as_png()
    image = Image.open(BytesIO(png_bytes)).convert("RGB")
    image.save(save_path, "JPEG", quality=quality)
    print(f"   ✅ Full‑page screenshot saved to {save_path}")

def take_landscape_screenshot(driver: webdriver.Chrome, save_path: str,
                              width: int = 2160, height: int = 1200,
                              quality: int = 95) -> None:
    """Landscape (fixed 1920×1200) screenshot – taken first."""
    driver.set_window_size(width, height)
    png_bytes = driver.get_screenshot_as_png()
    image = Image.open(BytesIO(png_bytes)).convert("RGB")
    image.save(save_path, "JPEG", quality=quality)
    print(f"   ✅ Landscape screenshot saved to {save_path}")

def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(
        description="Take landscape and full-page screenshots of domains and IPs."
    )
    parser.add_argument("domains_file", help="Path to file with domains/IPs.")
    parser.add_argument("-o", default="screenshots", help="Directory to save screenshots.")
    parser.add_argument("-s", help="Skip till entry.")
    args = parser.parse_args(argv)

    raw_entries = get_domain_list(args.domains_file)
    if not raw_entries:
        print("❌ No entries found in the input file.")
        sys.exit(1)

    screenshot_dir = os.path.abspath(args.o)
    _SKIP = False
    if args.s and len(args.s):
        print(f"Skipping to {args.s}")
        _SKIP = True

    os.makedirs(screenshot_dir, exist_ok=True)
    print(f"📸 Screenshots will be saved to: {screenshot_dir}")

    driver = None
    try:
        driver = create_driver()
        for raw_entry in raw_entries:
            if _SKIP and raw_entry == args.s:
                _SKIP = False
                continue

            if _SKIP:
                print(f"Skipping: {raw_entry}")
                continue

            raw_entry = raw_entry.replace(" ", "")
            ipv4, domain = None, None

            if ":" in raw_entry:
                ipv4, domain = [p.strip() for p in raw_entry.split(":", 1)]
            elif any(c.isalpha() for c in raw_entry):
                domain = raw_entry
            else:
                ipv4 = raw_entry

            print(f"\n📌 Processing: {raw_entry}")

            urls_to_try: List[Tuple[str, str, Optional[int], str]] = []

            if ipv4:
                for port in IP_PORTS:
                    scheme = "http" if port == 80 else "https"
                    urls_to_try.append((f"{scheme}://{ipv4}:{port}", "ip", port, ipv4))
            
            if domain:
                if any(domain.endswith("." + d) for d in EXCLUDE_DOMAINS):
                    print(f"   🚫 Skipping domain {domain} – excluded by policy.")
                else:
                    urls_to_try.append((f"http://{domain}", "domain", 80, domain))
                    urls_to_try.append((f"https://{domain}", "domain", 443, domain))

            if not urls_to_try:
                print(f"   ⚠️  Could not determine any URLs to try for entry: {raw_entry}")
                continue

            any_success = False
            for url, src_type, port, base_name in urls_to_try:
                print(f"   Trying URL: {url}")
                driver.set_page_load_timeout(3)
                
                try:
                    driver.get(url)
                    print(f"   ✅ Page loaded. Final URL: {driver.current_url}")
                    
                    port_suffix = f"_{port}"
                    landscape_name = f"{base_name}_{src_type}{port_suffix}_landscape.png"
                    fullpage_name = f"{base_name}_{src_type}{port_suffix}_fullpage.png"
                    
                    take_landscape_screenshot(driver, os.path.join(screenshot_dir, landscape_name))
                    take_fullpage_screenshot(driver, os.path.join(screenshot_dir, fullpage_name))
                    
                    any_success = True

                # FIX: Catch both Timeout and WebDriverException for all common navigation failures.
                except TimeoutException:
                    print(f"   ❌ Timed out loading page.")
                except WebDriverException as e:
                    # This provides a clean, one-line error for DNS errors, connection refused, etc.
                    error_message = e.msg.split('\n')[0] # Get just the first line of the error
                    print(f"   ❌ Page failed to load: {error_message}")
                except Exception as e:
                    # This is a final safety net for truly unexpected script errors
                    print(f"   ❌ A script error occurred: {e}")


            if not any_success:
                print(f"   ❌ No successful screenshots could be captured for {raw_entry}.")

    finally:
        print("\n👋 Shutting down driver...")
        if driver:
            driver.quit()

if __name__ == "__main__":

    main(sys.argv[1:])
