"""Attach answers/notes from OCR'd Likamundi trainer screenshots to parsed questions.

Two screenshot kinds are usable:
  * trainer result pages: "Die Frage lautete" ... "Die korrekten Antworten waren:" ... "Anmerkung"
    -> matched to Likamundi set questions (or official questions) by text similarity
  * likamundi.de question views with an explicit "Id: NNN" and check marks before the correct options
Everything else (Zoom / PDF viewer frames) is ignored. Output: out/ocr_answers.json + a cross-check report.
"""
import json, os, re, glob, unicodedata, difflib, collections

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "out")
OCR = os.path.join(HERE, "ocr")


def norm(s):
    s = unicodedata.normalize("NFKC", s).lower()
    s = re.sub(r"[^a-z0-9äöüß ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def qtext(q):
    return norm(q["stem"] + " " + " ".join(q.get("statements", [])))


def digits_of(text):
    """Set of statement numbers an option/answer text refers to ('Nur die Aussagen 1, 3 und 4' -> {1,3,4})."""
    t = text.lower()
    if "alle aussagen" in t or "alle antworten" in t:
        return {1, 2, 3, 4, 5}
    if "keine der aussagen" in t:
        return set()
    return set(int(d) for d in re.findall(r"\b([1-5])\b", t))


def letters_from_block(block, q):
    """Map the OCR answer block to option letters of question q."""
    nb = norm(block)
    found = []
    for k, opt in q["options"].items():
        if q["type"] == "kombination" or re.search(r"nur die aussage|alle aussagen", opt.lower()):
            if digits_of(opt) and digits_of(opt) == digits_of(block):
                found.append(k)
        else:
            no = norm(opt)
            if not no:
                continue
            head = no[:28]
            if head and head in nb:
                found.append(k)
            elif difflib.SequenceMatcher(None, no, nb).ratio() > 0.8:
                found.append(k)
    return sorted(set(found))


def main():
    lika = json.load(open(os.path.join(OUT, "likamundi_raw.json")))
    official = json.load(open(os.path.join(OUT, "official.json")))
    cands = [("lika", q["lid"], q, qtext(q)) for q in lika] + [("off", q["id"], q, qtext(q)) for q in official]
    by_lid = {q["lid"]: q for q in lika}
    results = {}   # key -> {answer, note, source, kind}
    report = collections.Counter()
    disagreements = []
    for f in sorted(glob.glob(os.path.join(OCR, "*.txt"))):
        t = open(f).read()
        name = os.path.basename(f)
        # ---- kind 1: trainer result page
        if "korrekten Antwort" in t and "Frage lautete" in t:
            report["result_pages"] += 1
            m = re.search(r"Frage lautete(.*?)Ihre Antwort", t, re.S)
            m2 = re.search(r"korrekten Antworten? waren?:?(.*?)(Anmerkung|Verbleibende|$)", t, re.S)
            m3 = re.search(r"Anmerkung\s*(.*?)(Verbleibende|$)", t, re.S)
            if not (m and m2):
                report["result_unparsed"] += 1; continue
            qn = norm(m[1])[:400]
            scored = sorted(((difflib.SequenceMatcher(None, qn, c[3][:400]).ratio(), i) for i, c in enumerate(cands)), reverse=True)[:2]
            best, second = scored[0], scored[1]
            if best[0] < 0.62 or best[0] - second[0] < 0.05:
                report["result_nomatch"] += 1; continue
            kind, key, q, _ = cands[best[1]]
            letters = letters_from_block(m2[1], q)
            expected = 2 if q["type"] == "mehrfach" else 1
            if len(letters) != expected:
                report["result_badletters"] += 1; continue
            note = (m3[1].strip() if m3 else "")
            note = re.sub(r"\s+", " ", note)
            rec = {"answer": letters, "note": note if len(note) > 12 else "", "source": name, "kind": "trainer", "sim": round(best[0], 2)}
            if kind == "off":
                if sorted(q["answer"]) != letters:
                    disagreements.append((key, q["answer"], letters, name))
                else:
                    report["official_confirmed"] += 1
                results.setdefault(key, rec)
            else:
                results.setdefault(key, rec)
            report["result_matched_" + kind] += 1
        # ---- kind 2: likamundi.de view with explicit Id
        elif re.search(r"\bId:\s*\d+", t) and ("Deine Antwort" in t or "richtige Antwort" in t):
            report["id_pages"] += 1
            lid = int(re.search(r"\bId:\s*(\d+)", t)[1])
            q = by_lid.get(lid)
            if not q:
                report["id_unknown"] += 1; continue
            marks = re.findall(r"(?m)^[^\w\n]{0,6}?[YVv✓]\s?([A-E])\)", t)
            expected = 2 if q["type"] == "mehrfach" else 1
            letters = sorted(set(marks))
            if len(letters) != expected:
                report["id_badmarks"] += 1; continue
            results.setdefault(lid, {"answer": letters, "note": "", "source": name, "kind": "web", "sim": 1.0})
            report["id_matched"] += 1
    json.dump({str(k): v for k, v in results.items()}, open(os.path.join(OUT, "ocr_answers.json"), "w"), ensure_ascii=False, indent=1)
    print(dict(report))
    print("answers total", len(results), "for likamundi", sum(1 for k in results if isinstance(k, int)))
    print("disagreements official vs trainer:", len(disagreements))
    for d in disagreements:
        print("  ", d)


if __name__ == "__main__":
    main()
