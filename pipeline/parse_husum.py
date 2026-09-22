"""Parse the Husum (Kreis Nordfriesland) HPP exams that contain real text.

Format: "N." on its own line, stem lines, then option letter lines "A".."E" each followed by text lines.
Answer key: "Lösungsbogen" section at the end with alternating number / letter lines. Single choice only.
"""
import pymupdf, re, json, os, unicodedata, glob

ROOT = "/Users/sgeier/Projects/Phine-Lernen/HPP 2026/Prüfungsfragen/Husum/"
OUT = os.path.join(os.path.dirname(__file__), "out")
EXAMS = [  # (glob, label, date)
    ("2018_*", "Husum 2018", "2018"),
    ("2019_*", "Husum 2019", "2019"),
    ("2022_*", "Husum 2022", "2022"),
    ("2023_*", "Husum 2023", "2023"),
    ("2024_*", "Husum 2024", "2024-09-25"),
    ("2025-03_*", "Husum März 2025", "2025-03"),
]
RE_Q = re.compile(r"^(\d{1,2})\.\s*$")
RE_LETTER = re.compile(r"^([A-E])\s*$")
NOISE = re.compile(r"^(Seite \d+ von \d+|Version [AB]|Kreis Nordfriesland|Gesundheitsamt|© Copyright.*|Alle Rechte.*|vorbehalten\.?|\d{1,3})\s*$")


def norm(s):
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"[-]", " ", s)
    return re.sub(r"[ \t]+", " ", s).strip()


def parse(path, label, date):
    doc = pymupdf.open(path)
    lines = []
    for page in doc:  # keep x-position: question numbers sit at the left margin, page numbers do not
        for b in page.get_text("dict")["blocks"]:
            for ln in b.get("lines", []):
                t = norm("".join(sp["text"] for sp in ln["spans"]))
                if t:
                    lines.append(f"{t}." if re.fullmatch(r"\d{1,2}", t) and ln["bbox"][0] < 100 else t)
    # split off the answer sheet
    ki = next((i for i, l in enumerate(lines) if l.startswith("Lösungsbogen")), None)
    qlines, klines = (lines[:ki], lines[ki:]) if ki is not None else (lines, [])
    # answer key: number line followed by letter line
    key = {}
    for i in range(len(klines) - 1):
        if klines[i].isdigit() and RE_LETTER.match(klines[i + 1]):
            key.setdefault(int(klines[i]), klines[i + 1])
    # questions
    qs, cur = [], None
    warn = []
    for l in qlines:
        m = RE_Q.match(l)
        if m and (cur is None or int(m.group(1)) == cur["nr"] + 1):
            cur = {"nr": int(m.group(1)), "stem": [], "options": {}, "_last": None}
            qs.append(cur); continue
        if cur is None or NOISE.match(l):
            continue
        ml = RE_LETTER.match(l)
        if ml and (ml.group(1) == "A" or cur["_last"]) and ml.group(1) not in cur["options"]:
            cur["_last"] = ml.group(1); cur["options"][ml.group(1)] = ""; continue
        if cur["_last"]:
            cur["options"][cur["_last"]] = (cur["options"][cur["_last"]] + " " + l).strip()
        else:
            cur["stem"].append(l)
    out = []
    for q in qs:
        nr = q["nr"]
        if sorted(q["options"]) != list("ABCDE") or any(not v for v in q["options"].values()):
            warn.append(f"Q{nr}: options {[k for k, v in q['options'].items() if v]}")
        if nr not in key:
            warn.append(f"Q{nr}: no key")
        out.append({
            "id": f"hus-{date}-{nr:02d}", "pool": "husum", "exam": label, "date": date, "nr": nr,
            "type": "einfach", "stem": " ".join(q["stem"]).strip(), "instruction": "",
            "statements": [], "options": q["options"], "numbered_options": False,
            "answer": [key[nr]] if nr in key else [], "keys": {"Gesundheitsamt Nordfriesland (Lösungsbogen)": key.get(nr, "")},
            "source": os.path.basename(path),
        })
    print(f"{label:16s} q={len(qs):2d} keys={len(key):2d} warn={len(warn)}" + ("  " + " | ".join(warn) if warn else ""))
    return out


def main():
    all_q = []
    for pat, label, date in EXAMS:
        path = sorted(glob.glob(ROOT + pat))[0]
        all_q += parse(path, label, date)
    json.dump(all_q, open(os.path.join(OUT, "husum.json"), "w"), ensure_ascii=False, indent=1)
    print("total", len(all_q))


if __name__ == "__main__":
    main()
