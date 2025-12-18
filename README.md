# MPGB NPA Quick Search (GitHub Pages)

This is a **static** (no-server) web app to search NPA accounts from your **All NPA** XLSB and generate a **mobile-friendly one-pager**.

## What you get
- Account search by Acct Number
- Details fetched from `All NPA` data
- One-Pager page that you can **Print / Save as PDF**
- Follow-up save (stored locally in the browser)

## 1) Create GitHub repo
Create a repo like: `mpgb-npa-app`

## 2) Upload this project
Upload all files/folders from this zip.

## 3) Generate full data chunks on your PC
This repo contains **sample** chunk files only.

To create full data:
1. Install Python
2. Run:
   `pip install pyxlsb`
3. Run converter:
   `python tools/xlsb_to_chunks.py --input "All NPA ACs as on 30.09.2025 after MOC (1).xlsb" --out "data/chunks"`

Now upload the generated `data/chunks/*.json` to GitHub (replace sample).

## 4) Enable GitHub Pages
Repo → Settings → Pages → Source: `main` → `/root`

Your site URL will be:
`https://<username>.github.io/<repo>/`

## Notes
- Data is split as `{prefix}.json` where prefix is first 3 digits of account number.
- Follow-up entries save to browser LocalStorage (device-specific).

