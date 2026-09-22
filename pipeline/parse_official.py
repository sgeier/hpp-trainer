"""Parse the official HPP written exams (2018-2026) into JSON.

Sources: Prüfungsfragen/HPP_Pruefung_*.pdf (Institut Ehlert layout, answer grid on last page)
         Prüfungsfragen/HPP.Pruefung-2026.03-*.pdf (heilpraktiker-akademie layout, key in separate PDF)
Nothing is generated: stems, statements, options and answers are copied verbatim from the PDFs.
"""
import pymupdf, re, json, sys, unicodedata, collections, glob, os

ROOT = "/Users/sgeier/Projects/Phine-Lernen/HPP 2026/Prüfungsfragen/"
OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)

EXAMS = [  # (file, exam label, ISO date, key source for the grid)
    ("HPP_Pruefung_Maerz_2018_mit_Loesungen.pdf", "März 2018", "2018-03-21"),
    ("HPP_Pruefung_Oktober_2018.pdf", "Oktober 2018", "2018-10-10"),
    ("HPP_Pruefung_Maerz_2019_.pdf", "März 2019", "2019-03-20"),
    ("HPP_Pruefung_Oktober_2019_mit_Loesungen.pdf", "Oktober 2019", "2019-10-09"),
    ("HPP_Pruefung_Oktober_2020_mit_Loesungen.pdf", "Oktober 2020", "2020-10-14"),
    ("HPP_Pruefung_Maerz_2021_mit_Loesungen.pdf", "März 2021", "2021-03-17"),
    ("HPP_Pruefung_Oktober_2021_mit_Loesungen.pdf", "Oktober 2021", "2021-10-13"),
    ("HPP_Pruefung_Maerz_2022_mit_Loesungen_.pdf", "März 2022", "2022-03-16"),
    ("HPP_Pruefung_Oktober_2022_mit_Loesungen_.pdf", "Oktober 2022", "2022-10-12"),
    ("HPP_Pruefung_Maerz_2023_mit_Loesungen_.pdf", "März 2023", "2023-03-22"),
    ("HPP_Pruefung_Oktober_2023_mit_Loesungen_.pdf", "Oktober 2023", "2023-10-11"),
    ("HPP_Pruefung_Maerz_2024_mit_Loesungen_A_B.pdf", "März 2024", "2024-03-20"),
    ("HPP_Pruefung_Oktober_2024_mit_Loesungen_A_B.pdf", "Oktober 2024", "2024-10-09"),
    ("HPP_Pruefung_Maerz_2025_Gruppe_A_mit_Loesungen.pdf", "März 2025", "2025-03-19"),
    ("HPP_Pruefung_Oktober_2025_mit_Loesungen_Gruppe_A.pdf", "Oktober 2025", "2025-10-08"),
    ("HPP.Pruefung-2026.03-Pruefung-ohne-Loesungen.pdf", "März 2026", "2026-03-25"),
]
# In these three PDFs the question section is printed in Gruppe-B order although the header says Gruppe A:
# with the Gruppe-B grid every Mehrfachauswahl has exactly two letters and every other type one (0 violations),
# with the Gruppe-A grid there are 12-16 violations. Content check: Okt 2019 Q5 (Akathisie case) -> option 5/E = key B.
KEY_GROUP = {"Oktober 2019": "B", "März 2022": "B", "Oktober 2022": "B"}
TYPES = {"Einfachauswahl": "einfach", "Mehrfachauswahl": "mehrfach", "Aussagenkombination": "kombination"}
RE_HEAD = re.compile(r"^\s*(\d{1,2})\s*\.?\s+(Einfachauswahl|Mehrfachauswahl|Aussagenkombination)\s*$")
RE_FRAGE = re.compile(r"^\s*Frage\s+(\d{1,2})\s*$")
RE_TYPE = re.compile(r"^\s*(Einfachauswahl|Mehrfachauswahl|Aussagenkombination)\s*$")
RE_OPT = re.compile(r"^[\s‚'’]*([A-E])\s*[\.\)]\s*(.*)$")
RE_STMT = re.compile(r"^\s*([1-5])\s*\.\s*(.*)$")
RE_INSTR = re.compile(r"^\s*W[äa]hlen\s+Sie\b.*$", re.I)
NOISE = ("Institut Ehlert", "heilpraktiker-akademie", "ohne Gewähr", "Die Auswertung bezieht", "Prüfungsfragen", "Gruppe A")


def norm(s):
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"[\ue000-\uf8ff]", " ", s)  # private-use glyphs (checkbox symbols, "+" in keys)
    return re.sub(r"[ \t]+", " ", s).strip()


def page_lines(doc):
    """Text lines of the group-A question section only."""
    lines = []
    for page in doc:
        t = page.get_text()
        if "Lösungsschlüssel" in t:
            break
        lines.extend(norm(l) for l in t.split("\n"))
    # cut at the "Gruppe B" heading (second question set) if it exists as a standalone line
    for i, l in enumerate(lines):
        if re.fullmatch(r"Gruppe B\s*", l) and i > 50:
            lines = lines[:i]
            break
    return [l for l in lines if l]


def split_questions(lines):
    """Yield (nr, type, body_lines)."""
    blocks, cur = [], None
    i = 0
    while i < len(lines):
        l = lines[i]
        m = RE_HEAD.match(l)
        if m:
            cur = [int(m.group(1)), TYPES[m.group(2)], []]
            blocks.append(cur); i += 1; continue
        m = RE_FRAGE.match(l)
        if m:
            # akademie layout: "Frage N", maybe a page number, then the type line
            j = i + 1
            while j < len(lines) and j <= i + 3 and not RE_TYPE.match(lines[j]):
                j += 1
            if j < len(lines) and RE_TYPE.match(lines[j]):
                cur = [int(m.group(1)), TYPES[RE_TYPE.match(lines[j]).group(1)], []]
                blocks.append(cur); i = j + 1; continue
        if cur is not None:
            if l.isdigit() or any(n in l for n in NOISE):
                i += 1; continue  # page numbers / headers
            cur[2].append(l)
        i += 1
    return blocks


def parse_block(nr, qtype, body, warn):
    stem, statements, options, instr = [], {}, {}, []
    mode = "stem"; last = None; appended = []  # (container, key, line) history for repairs
    numbered = False
    for l in body:
        mo = RE_OPT.match(l)
        ms = RE_STMT.match(l)
        # (c) options numbered 1.-5. instead of A)-E) (original exam typo, e.g. Okt 2020 Q18, Okt 2019 Q5)
        if ms and mode != "opt" and (qtype != "kombination" or len(statements) == 5):
            letter = "ABCDE"[int(ms.group(1)) - 1]
            if letter == "A" or mode == "numopt":
                mode = "numopt"; numbered = True; last = ("opt", letter); options[letter] = (ms.group(2) or "").strip(); continue
        if mo and mode == "numopt":
            mode = "opt"
        # (a) missing "A)" glyph: the previous line is option A
        if mo and mo.group(1) == "B" and "A" not in options and mode != "opt" and appended:
            c, k, prev = appended.pop()
            if c == "stem": stem.pop()
            elif c == "stmt": statements[k] = statements[k][: -len(prev)].strip()
            options["A"] = prev; mode = "opt"
        if RE_INSTR.match(l) and mode != "opt":
            instr.append(l); last = None; continue
        if mo and (mode == "opt" or (mo.group(1) == "A")):
            mode = "opt"; last = ("opt", mo.group(1)); options[mo.group(1)] = mo.group(2).strip(); appended = []; continue
        if ms and mode != "opt" and qtype == "kombination" and int(ms.group(1)) == len(statements) + 1:
            mode = "stmt"; last = ("stmt", int(ms.group(1))); statements[int(ms.group(1))] = (ms.group(2) or "").strip(); continue
        # continuation line
        if last and last[0] == "opt":
            options[last[1]] = (options[last[1]] + " " + l).strip(); appended.append(("opt", last[1], l))
        elif last and last[0] == "stmt":
            statements[last[1]] = (statements[last[1]] + " " + l).strip(); appended.append(("stmt", last[1], l))
        elif mode == "stem":
            stem.append(l); appended.append(("stem", None, l))
        else:
            warn.append(f"Q{nr}: stray line after {mode}: {l[:60]}")
    # (b) missing "E)" glyph: the last continuation line of D is option E
    if sorted(options) == list("ABCD") and appended and appended[-1][0] == "opt" and appended[-1][1] == "D":
        prev = appended[-1][2]
        options["D"] = options["D"][: -len(prev)].strip(); options["E"] = prev
        warn.append(f"Q{nr}: repaired E from D tail: {prev[:50]!r}")
    if sorted(options) != list("ABCDE"):
        warn.append(f"Q{nr}: options {sorted(options)}")
    if qtype == "kombination" and sorted(statements) != [1, 2, 3, 4, 5]:
        warn.append(f"Q{nr}: statements {sorted(statements)}")
    if not stem:
        warn.append(f"Q{nr}: empty stem")
    return {
        "nr": nr, "type": qtype,
        "stem": " ".join(stem).strip(),
        "instruction": " ".join(instr).strip(),
        "statements": [statements[k] for k in sorted(statements)],
        "options": {k: options[k] for k in sorted(options)},
        "numbered_options": numbered,
    }


def grid_key(doc):
    """Institut Ehlert grid: correct letters are black (0x000000), wrong ones gray."""
    merged = collections.defaultdict(dict)
    for page in doc:
        if "Lösungsschlüssel" not in page.get_text():
            continue
        words = page.get_text("words")
        nums = [(round(x0), round(y0), int(w)) for x0, y0, x1, y1, w, *_ in words if w.isdigit() and 1 <= int(w) <= 28]
        rows = collections.defaultdict(list)
        for x, y, n in nums:
            rows[round(y / 6)].append((x, n))
        headers = sorted((y * 6, r) for y, r in rows.items() if len(r) >= 10)
        if not headers:
            continue
        cells = []
        for b in page.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    tx = s["text"].strip()
                    if len(tx) == 1 and tx in "ABCDE":
                        cells.append((round(s["bbox"][0]), round(s["bbox"][1]), tx, s["color"]))
        glab = []
        for x0, y0, x1, y1, w, *_ in words:
            if w == "Gruppe":
                l = [w2 for a, b, c, d, w2, *_ in words if abs(b - y0) < 3 and w2 in ("A", "B")]
                glab.append((round(y0), l[0] if l else "?"))
        for i, (hy, hr) in enumerate(headers):
            hnext = headers[i + 1][0] if i + 1 < len(headers) else hy + 400
            lim = min(hnext, hy + 170)
            grp = max([g for g in glab if g[0] < hy], default=(0, "A"))[1]
            ans = collections.defaultdict(set)
            for x, y, tx, col in cells:
                if hy < y < lim and col == 0:
                    q = min(hr, key=lambda c: abs(c[0] - x))
                    if abs(q[0] - x) < 16:
                        ans[q[1]].add(tx)
            for q, a in ans.items():
                merged[grp][q] = "".join(sorted(a))
    return merged


def akademie_key(path):
    t = pymupdf.open(path)[0].get_text() + "\n" + "".join(p.get_text() for p in pymupdf.open(path)[1:])
    t = re.sub(r"[\ue000-\uf8ff]", "", t).split("GRUPPE B")[0]
    d = {}
    for m in re.finditer(r"Frage\s*(\d+)\s*\n\s*([A-E]{1,3})\b", t):
        d.setdefault(int(m.group(1)), "".join(sorted(m.group(2))))
    return d


def main():
    all_q = []
    for fname, label, date in EXAMS:
        path = ROOT + fname
        doc = pymupdf.open(path)
        warn = []
        blocks = split_questions(page_lines(doc))
        if label == "März 2026":
            key = akademie_key(ROOT + "HPP-Loesungsschluessel-03_2026_Version2.0.pdf"); ksrc = "heilpraktiker-akademie.de"
        else:
            key = grid_key(doc).get(KEY_GROUP.get(label, "A"), {}); ksrc = "Institut Ehlert"
        nrs = [b[0] for b in blocks]
        if nrs != list(range(1, 29)):
            warn.append(f"question numbers: {nrs}")
        for nr, qtype, body in blocks:
            q = parse_block(nr, qtype, body, warn)
            ans = key.get(nr, "")
            if not ans:
                warn.append(f"Q{nr}: no key")
            elif qtype == "mehrfach" and len(ans) != 2:
                warn.append(f"Q{nr}: mehrfach with key {ans}")
            elif qtype != "mehrfach" and len(ans) != 1:
                warn.append(f"Q{nr}: {qtype} with key {ans}")
            q.update({
                "id": f"off-{date}-{nr:02d}", "pool": "official", "exam": label, "date": date,
                "answer": list(ans), "keys": {ksrc: ans}, "source": fname,
            })
            all_q.append(q)
        print(f"{label:13s} q={len(blocks):2d} keys={len(key):2d} warn={len(warn)}" + ("  " + " | ".join(warn) if warn else ""))
    json.dump(all_q, open(os.path.join(OUT, "official.json"), "w"), ensure_ascii=False, indent=1)
    print("total", len(all_q))


if __name__ == "__main__":
    main()
