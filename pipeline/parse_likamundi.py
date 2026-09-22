"""Parse Likamundi question PDFs.

Two kinds:
  * question sets ("20 Fragen" per topic): no answers, options preceded by a "□" line
  * "kommentiert" PDFs: correct options preceded by "✓", explanations after each option
Every question carries the Likamundi Id "(Id: NNN)", which is used to merge both kinds.
"""
import pymupdf, re, json, os, glob, unicodedata, collections

ROOT = "/Users/sgeier/Projects/Phine-Lernen/HPP 2026/Prüfungsfragen/"
OUT = os.path.join(os.path.dirname(__file__), "out")
TYPES = {"Einfachauswahl": "einfach", "Mehrfachauswahl": "mehrfach", "Aussagenkombination": "kombination"}
RE_HEAD = re.compile(r"^(\d{1,3})\s+(Einfachauswahl|Mehrfachauswahl|Aussagenkombination)\s*$")
RE_ID = re.compile(r"^\(Id:\s*(\d+)\)\s*$")
RE_OPT = re.compile(r"^([A-E])\)\s*(.*)$")
RE_STMT = re.compile(r"^([1-5])\.\s+(.*)$")
RE_INSTR = re.compile(r"^W[äa]hle(n Sie)?\b.*$", re.I)
RE_ZU = re.compile(r"^[Zz]u\s+([1-5])\.?\s*(.*)$")
RE_EXPL = re.compile(r"^(Richtig|Falsch)\b")
NOISE = re.compile(r"^(© by Heilpraktikerschule Likamundi.*|für Josephine Schütte.*|für Likamundi|hallo@likamundi\.de|mail@phine\.de|i|\d{1,3})$")
MARK_NO, MARK_YES = "□", "✓"


def norm(s):
    s = unicodedata.normalize("NFKC", s)
    return re.sub(r"[ \t]+", " ", s).strip()


def read_lines(path):
    doc = pymupdf.open(path)
    out, title = [], []
    for pi, page in enumerate(doc):
        t = page.get_text()
        if "Übertragungsbogen" in t:
            break
        ls = [norm(l) for l in t.split("\n")]
        if pi == 0:
            for l in ls[1:]:
                if l.startswith("Heilpraktikerschule Likamundi") or l.startswith("Copyright"):
                    break
                if l:
                    title.append(l)
        out += [l for l in ls if l and not NOISE.match(l)]
    return out, " · ".join(t for t in title if t and not re.match(r"^\d+ Fragen$", t))


def parse_file(path, commented):
    lines, title = read_lines(path)
    qs, cur = [], None
    i = 0
    while i < len(lines):
        l = lines[i]
        m = RE_HEAD.match(l)
        if m and i + 1 < len(lines) and RE_ID.match(lines[i + 1]):
            cur = {"lid": int(RE_ID.match(lines[i + 1]).group(1)), "type": TYPES[m.group(2)], "stem": [], "instruction": [],
                   "statements": {}, "options": {}, "marks": {}, "expl": {}, "general": [], "_mode": "stem", "_last": None}
            qs.append(cur); i += 2; continue
        if cur is None:
            i += 1; continue
        if l in (MARK_NO, MARK_YES) or l.startswith(MARK_YES) or l.startswith(MARK_NO):
            cur["_pending_mark"] = MARK_YES if l.startswith(MARK_YES) else MARK_NO
            rest = l[1:].strip()
            if RE_OPT.match(rest):  # marker and option on the same line
                lines.insert(i + 1, rest)
            i += 1; continue
        mo = RE_OPT.match(l)
        if mo and cur["_mode"] != "general" and (mo.group(1) == "A" or cur["options"]):
            k = mo.group(1)
            cur["options"][k] = mo.group(2).strip(); cur["marks"][k] = cur.pop("_pending_mark", None)
            cur["_mode"] = "opt"; cur["_last"] = k; i += 1; continue
        mz = RE_ZU.match(l)
        if mz and cur["_mode"] in ("opt", "general") and "E" in cur["options"]:
            cur["_mode"] = "general"; cur["general"].append(l); i += 1; continue
        if cur["_mode"] == "general":
            cur["general"].append(l); i += 1; continue
        if cur["_mode"] == "opt":
            k = cur["_last"]
            if commented and (RE_EXPL.match(l) or k in cur["expl"]):
                cur["expl"].setdefault(k, []).append(l)
            else:
                cur["options"][k] = (cur["options"][k] + " " + l).strip()
            i += 1; continue
        ms = RE_STMT.match(l)
        if RE_INSTR.match(l):
            cur["instruction"].append(l); cur["_last"] = None; i += 1; continue
        if ms and cur["type"] == "kombination" and int(ms.group(1)) == len(cur["statements"]) + 1:
            cur["statements"][int(ms.group(1))] = ms.group(2).strip(); cur["_mode"] = "stmt"; cur["_last"] = ("s", int(ms.group(1))); i += 1; continue
        if cur["_mode"] == "stmt" and cur["_last"]:
            cur["statements"][cur["_last"][1]] += " " + l
        else:
            cur["stem"].append(l)
        i += 1
    out = []
    for q in qs:
        rec = {
            "lid": q["lid"], "type": q["type"], "stem": " ".join(q["stem"]).strip(), "instruction": " ".join(q["instruction"]),
            "statements": [q["statements"][k].strip() for k in sorted(q["statements"])],
            "options": {k: q["options"][k] for k in sorted(q["options"])},
            "title": title, "source": os.path.relpath(path, ROOT), "commented": commented,
        }
        if commented:
            rec["answer"] = [k for k in sorted(q["marks"]) if q["marks"][k] == MARK_YES]
            rec["expl"] = {k: " ".join(v) for k, v in q["expl"].items()}
            rec["general"] = " ".join(q["general"])
        out.append(rec)
    return out


def main():
    files = sorted(glob.glob(ROOT + "_Likamundi*/**/*.pdf", recursive=True))
    sets, comm = [], []
    for p in files:
        name = os.path.basename(p)
        commented = "kommentiert" in name or "mitanmerkungen" in name.lower() or "mitLös" in name
        if "ohnelosung" in name or "zeittafel" in name or "kongress" in name:
            continue
        recs = parse_file(p, commented)
        (comm if commented else sets).extend(recs)
    by_id = {}
    warn = []
    for r in sets + comm:
        if sorted(r["options"]) != list("ABCDE"):
            warn.append(f"{r['source'][-40:]} Id {r['lid']}: options {sorted(r['options'])}")
        if r["type"] == "kombination" and len(r["statements"]) != 5:
            warn.append(f"{r['source'][-40:]} Id {r['lid']}: statements {len(r['statements'])}")
        if r["commented"] and not r["answer"]:
            warn.append(f"{r['source'][-40:]} Id {r['lid']}: no ✓")
        if r["commented"] and r["type"] == "mehrfach" and len(r["answer"]) != 2:
            warn.append(f"{r['source'][-40:]} Id {r['lid']}: mehrfach answer {r['answer']}")
        prev = by_id.get(r["lid"])
        if prev is None:
            by_id[r["lid"]] = r
        else:
            # merge: keep set text (cleaner), add answer/explanations from commented
            if r["commented"]:
                prev.update({k: r[k] for k in ("answer", "expl", "general") if k in r}); prev["commented"] = True
                prev.setdefault("sources", []).append(r["source"])
            elif not prev.get("title"):
                prev["title"] = r["title"]
    print(f"set questions {len(sets)}, commented {len(comm)}, unique Ids {len(by_id)}, with answer {sum(1 for r in by_id.values() if r.get('answer'))}")
    print(f"warnings {len(warn)}"); [print("  ", w) for w in warn[:40]]
    json.dump(list(by_id.values()), open(os.path.join(OUT, "likamundi_raw.json"), "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
