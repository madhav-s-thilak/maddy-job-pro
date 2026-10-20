#!/usr/bin/env python3
"""
Package job-tracker-extension/ into a zip the dashboard offers for download.

    python3 scripts/package_extension.py          # (re)build the zip
    python3 scripts/package_extension.py --check  # exit 1 if the zip is stale

The zip lives in job-tracker-frontend/public/ so it ships with the frontend
(which may be deployed on its own, without the extension folder next to it).
Output is deterministic (sorted entries, fixed timestamps), so --check can
compare bytes and the zip only changes in git when the extension does.

Unzipping gives a single `job-tracker-extension/` folder: the one to pick in
chrome://extensions -> Load unpacked.
"""
import io
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "job-tracker-extension")
DEST = os.path.join(ROOT, "job-tracker-frontend", "public", "job-tracker-extension.zip")
TOP = "job-tracker-extension"
SKIP_NAMES = {".DS_Store", "Thumbs.db"}
SKIP_DIRS = {"__pycache__", "node_modules", ".git"}
FIXED_TIME = (2020, 1, 1, 0, 0, 0)


def collect():
    files = []
    for dirpath, dirnames, filenames in os.walk(SRC):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for name in sorted(filenames):
            if name in SKIP_NAMES:
                continue
            full = os.path.join(dirpath, name)
            files.append((os.path.relpath(full, SRC).replace(os.sep, "/"), full))
    return sorted(files)


def build_bytes():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for rel, full in collect():
            info = zipfile.ZipInfo(f"{TOP}/{rel}", date_time=FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            with open(full, "rb") as fh:
                zf.writestr(info, fh.read())
    return buf.getvalue()


def main():
    if not os.path.isfile(os.path.join(SRC, "manifest.json")):
        sys.exit(f"manifest.json not found in {SRC}")
    data = build_bytes()
    if "--check" in sys.argv:
        current = open(DEST, "rb").read() if os.path.isfile(DEST) else None
        if current != data:
            sys.exit("STALE: extension zip is out of date. Run: python3 scripts/package_extension.py")
        print("OK: extension zip is up to date")
        return
    os.makedirs(os.path.dirname(DEST), exist_ok=True)
    with open(DEST, "wb") as fh:
        fh.write(data)
    print(f"Wrote {os.path.relpath(DEST, ROOT)} ({len(data):,} bytes, {len(collect())} files)")


if __name__ == "__main__":
    main()
