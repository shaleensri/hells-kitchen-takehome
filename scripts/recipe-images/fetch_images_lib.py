"""Shared helpers for fetch-images.py and fetch-images-retry.py. Not a
standalone entry point — see fetch-images.py for the primary pass and
fetch-images-retry.py for the targeted retry pass (both one-off sourcing
scripts, not runtime code; see this folder's README.md)."""
import json
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = REPO_ROOT / "backend-app" / "db" / "data.json"
OUT_DIR = REPO_ROOT / "frontend-app" / "public" / "images" / "recipes"
CANDIDATES_JSON = REPO_ROOT / "scripts" / "recipe-images" / "candidates.json"

USER_AGENT = "HellsKitchenTakeHome/1.0 (contact: shaleen0601@gmail.com; educational take-home project, non-commercial)"
API = "https://commons.wikimedia.org/w/api.php"
ALLOWED_LICENSES = {"cc0", "pd", "public domain"}
ALLOWED_LICENSE_PREFIXES = ("cc-by",)
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
TARGET_WIDTH = 1400
MIN_WIDTH = 700


def api_get(params):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def search_candidates(query, limit=8):
    data = api_get(
        {
            "action": "query",
            "list": "search",
            "srnamespace": 6,
            "srlimit": limit,
            "format": "json",
            "srsearch": query,
        }
    )
    return [r["title"] for r in data.get("query", {}).get("search", [])]


def license_ok(license_value):
    # Wikimedia returns license names in two formats depending on which
    # extmetadata field supplied it: "LicenseShortName" uses spaces (e.g.
    # "CC BY-SA 4.0"), the "License" template-derived field uses hyphens
    # (e.g. "cc-by-sa-4.0"). Normalizing to hyphens before comparing is not
    # optional — without it, every space-formatted CC-BY(-SA) license (the
    # majority of what Commons actually returns) was silently rejected here,
    # which is why the first two fetch passes came back nearly empty for
    # several recipes. Caught by cross-checking a manual API query against
    # this function's real output, not assumed.
    if not license_value:
        return False
    v = license_value.lower().replace(" ", "-")
    if v in ALLOWED_LICENSES or v in {"public-domain"}:
        return True
    return v.startswith(ALLOWED_LICENSE_PREFIXES)


def get_imageinfo(file_title):
    data = api_get(
        {
            "action": "query",
            "titles": file_title,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata|mime|size",
            "iiurlwidth": TARGET_WIDTH,
            "format": "json",
        }
    )
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        infos = page.get("imageinfo")
        if infos:
            return infos[0]
    return None


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def extract_meta(file_title, info):
    meta = info.get("extmetadata", {})

    def val(key):
        return meta.get(key, {}).get("value", "")

    return {
        "fileTitle": file_title,
        "descriptionUrl": info.get("descriptionurl", ""),
        "thumbUrl": info.get("thumburl") or info.get("url"),
        "mime": info.get("mime", ""),
        "width": info.get("thumbwidth") or info.get("width"),
        "height": info.get("thumbheight") or info.get("height"),
        "license": val("LicenseShortName") or val("License"),
        "licenseUrl": val("LicenseUrl"),
        "artist": strip_html(val("Artist")),
        "credit": strip_html(val("Credit")),
        "imageDescription": strip_html(val("ImageDescription")),
    }


def choose_best(file_titles):
    tried = []
    for title in file_titles:
        ext = title.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            tried.append({"fileTitle": title, "rejected": f"extension .{ext} not allowed"})
            continue
        try:
            info = get_imageinfo(title)
        except Exception as e:  # noqa: BLE001 - best effort, log and move on
            tried.append({"fileTitle": title, "rejected": f"imageinfo fetch failed: {e}"})
            continue
        time.sleep(0.3)
        if not info:
            tried.append({"fileTitle": title, "rejected": "no imageinfo returned"})
            continue
        m = extract_meta(title, info)
        width = m.get("width") or 0
        if width < MIN_WIDTH:
            tried.append({**m, "rejected": f"too small ({width}px wide)"})
            continue
        if not license_ok(m.get("license", "")):
            tried.append({**m, "rejected": f"license not in allowed set ({m.get('license')!r})"})
            continue
        tried.append({**m, "accepted": True})
        return m, tried
    return None, tried


def download_and_convert(url, recipe_id):
    tmp_path = OUT_DIR / f"_tmp_{recipe_id}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    tmp_path.write_bytes(raw)

    out_path = OUT_DIR / f"{recipe_id}.jpg"
    subprocess.run(
        [
            "sips",
            "-s",
            "format",
            "jpeg",
            "-s",
            "formatOptions",
            "80",
            "--resampleWidth",
            str(TARGET_WIDTH),
            str(tmp_path),
            "--out",
            str(out_path),
        ],
        check=True,
        capture_output=True,
    )
    tmp_path.unlink()
    return out_path
