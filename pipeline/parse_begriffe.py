"""Export the vocabulary quiz from Lernstuff/Begriffe/HPP Fachbegriffe.xlsx (391 terms with quiz answer + distractor)."""
import openpyxl, json, os

SRC = "/Users/sgeier/Projects/Phine-Lernen/HPP 2026/Lernstuff/Begriffe/HPP Fachbegriffe.xlsx"
OUT = os.path.join(os.path.dirname(__file__), "out")


def main():
    ws = openpyxl.load_workbook(SRC, read_only=True, data_only=True).worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    header = [str(c).strip() if c else "" for c in rows[0]]
    print("header:", header)
    # header row is offset: first column has no header ("Begriff"), so map by position
    out = []
    for r in rows[1:]:
        cells = [("" if c is None else str(c).strip()) for c in r]
        if not cells or not cells[0]:
            continue
        term, erkl = cells[0], cells[1] if len(cells) > 1 else ""
        rec = {"term": term, "explanation": erkl}
        for i, h in enumerate(header):
            if i < len(cells) and h:
                rec[h] = cells[i]
        out.append(rec)
    keys = collections = {}
    print("terms:", len(out), "with quiz answer:", sum(1 for r in out if r.get("Quiz: richtige Antwort")),
          "with distractor:", sum(1 for r in out if r.get("Quiz: Distraktor")))
    print("sample:", json.dumps(out[5], ensure_ascii=False)[:400])
    json.dump(out, open(os.path.join(OUT, "begriffe.json"), "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
