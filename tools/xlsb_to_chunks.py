#!/usr/bin/env python3
"""Convert your XLSB (All NPA sheet) into prefix-wise JSON chunks for GitHub Pages.

Why chunks?
- Loading a single 2.8+ lakh row file in a browser is slow.
- Prefix chunks let the app download ONLY the needed file, e.g. data/chunks/200.json

Usage (Windows):
  1) Install Python 3.10+ and run:
       pip install pyxlsb
  2) Put this script in a folder, and run:
       python xlsb_to_chunks.py --input "All NPA ACs as on 30.09.2025 after MOC (1).xlsb" --out ./data/chunks

Options:
  --prefix-len 3   (default: 3)
  --flush 5000      (write to disk after this many accounts per prefix)
"""

import argparse, os, json
from collections import defaultdict
from pyxlsb import open_workbook

def norm_header(h):
    if h is None:
        return ""
    return str(h).strip().replace("\n", " ").replace("  ", " ")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Path to .xlsb file")
    ap.add_argument("--out", required=True, help="Output folder for chunks")
    ap.add_argument("--sheet", default="All NPA", help="Sheet name (default: All NPA)")
    ap.add_argument("--prefix-len", type=int, default=3)
    ap.add_argument("--flush", type=int, default=5000)
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    buffers = defaultdict(dict)

    def flush(prefix):
        if not buffers[prefix]:
            return
        fpath = os.path.join(args.out, f"{prefix}.json")
        # merge if exists
        if os.path.exists(fpath):
            with open(fpath, "r", encoding="utf-8") as f:
                existing = json.load(f)
            existing.update(buffers[prefix])
            obj = existing
        else:
            obj = buffers[prefix]

        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False)
        buffers[prefix].clear()

    with open_workbook(args.input) as wb:
        with wb.get_sheet(args.sheet) as sh:
            it = sh.rows()
            headers = [c.v for c in next(it)]
            keys = [norm_header(h) for h in headers]

            total = 0
            for row in it:
                vals = [c.v for c in row]
                if not vals or vals[0] is None:
                    continue
                acct = str(int(vals[0])) if isinstance(vals[0], (int, float)) else str(vals[0]).strip()
                acct = ''.join(ch for ch in acct if ch.isdigit())
                if not acct:
                    continue

                rec = {k: v for k, v in zip(keys, vals) if k}
                prefix = acct[: args.prefix_len]
                buffers[prefix][acct] = rec
                total += 1

                if len(buffers[prefix]) >= args.flush:
                    flush(prefix)

                if total % 50000 == 0:
                    print(f"Processed {total} rows...")

    for p in list(buffers.keys()):
        flush(p)

    print("Done. Upload the generated data/chunks/*.json to your GitHub repo.")

if __name__ == "__main__":
    main()
