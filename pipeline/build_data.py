"""Assemble all parsed pools into one dataset for the app and encrypt it.

Steps: topic tagging (keyword heuristic, marked as automatic) · additional answer keys from other schools
· explanations from Likamundi commented PDFs attached to matching official questions (+ answer cross-check)
· vocabulary quiz · AES-GCM encryption with a passphrase (PBKDF2) -> app/data.enc
"""
import json, os, re, glob, difflib, unicodedata, collections, base64, hashlib, secrets, sys
import pymupdf
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
APP = os.path.join(os.path.dirname(HERE), "app")
ROOT = "/Users/sgeier/Projects/Phine-Lernen/HPP 2026/Prüfungsfragen/"

TOPICS = [  # (name, keywords) – first match on highest score; substring matching for German compounds
    ("Recht & Berufskunde", ["heilpraktiker", "heilprg", "schweigepflicht", "unterbringung", "psychkg", "betreuung", "betreuer", "einwilligung", "aufklärungspflicht", "dokumentationspflicht", "gesetz", "stgb", "bgb", "gericht", "richter", "polizei", "meldepflicht", "infektionsschutz", "patientenrecht", "berufsordnung", "werbung", "honorar", "haftung", "garantenstellung", "geschäftsfähig", "fixierung", "zwangseinweisung", "sgb", "krankenkasse", "approbation", "psychotherapeutengesetz", "gesundheitsamt", "erlaubnis", "verordnung", "rezept", "zeugnisverweigerung", "offenbarung", "unterlassene hilfeleistung", "betäubungsmittel"]),
    ("Suizidalität & Notfall", ["suizid", "selbsttötung", "krisenintervention", "notfall", "präsuizidal", "ringel", "pöldinger", "selbstmord", "fremdgefährdung", "eigengefährdung"]),
    ("Psychopharmaka", ["antidepressiv", "neuroleptik", "antipsychotik", "lithium", "ssri", "trizykl", "mao-hemmer", "psychopharmak", "medikament", "nebenwirkung", "serotonin-syndrom", "malignes neuroleptisches", "spätdyskinesie", "parkinsonoid", "methylphenidat", "stimmungsstabilis", "antikonvulsiv", "clozapin", "haloperidol", "tranquilizer", "hypnotika", "anxiolytik", "benzodiazepin", "agranulozytose", "anticholinerg", "frühdyskinesie", "wirkstoff"]),
    ("F0 Organische Störungen", ["demenz", "alzheimer", "delir", "organisch", "amnestisch", "korsakow", "pick-krankheit", "lewy", "vaskulär", "creutzfeld", "chorea", "huntington", "parkinson", "frontotemporal", "hirnorganisch", "durchgangssyndrom", "konfabulation"]),
    ("F1 Sucht & Substanzen", ["alkohol", "abhängigkeit", "sucht", "entzug", "drogen", "cannabis", "opiat", "opioid", "heroin", "kokain", "amphetamin", "rausch", "intoxikation", "craving", "toleranz", "schädlicher gebrauch", "ecstasy", "halluzinogen", "nikotin", "substanz", "methadon", "promille", "trinken", "wernicke"]),
    ("F2 Schizophrenie & Psychosen", ["schizophren", "wahn", "halluzination", "psychose", "psychotisch", "paranoid", "hebephren", "kataton", "schizoaffektiv", "schizotyp", "ich-störung", "gedankeneingebung", "gedankenentzug", "negativsymptom", "positivsymptom", "residuum", "erstrangsymptom", "schneider", "bleuler"]),
    ("F3 Affektive Störungen", ["depress", "manie", "manisch", "bipolar", "zyklothym", "dysthym", "affektive", "hypoman", "melanchol", "somatisches syndrom", "stimmung", "antriebslos", "anhedonie", "morgentief"]),
    ("F4 Angst, Zwang, Belastung, Somatoform", ["angst", "phobie", "panik", "zwang", "ptbs", "posttraumatisch", "belastungsstörung", "belastungsreaktion", "anpassungsstörung", "somatoform", "somatisierung", "hypochondr", "dissoziativ", "konversion", "neurasthenie", "depersonalisation", "derealisation", "agoraphob", "neurotisch", "neurose", "fugue", "trauma", "flashback"]),
    ("F5 Essen, Schlaf, Sexualität", ["anorex", "bulimi", "binge", "essstörung", "schlaf", "insomnie", "narkolepsie", "sexuell", "sexual", "wochenbett", "postpartal", "pavor", "somnambul", "adipositas", "erbrechen", "bmi", "libido", "orgasmus", "vaginismus", "erektion"]),
    ("F6 Persönlichkeit & Impulskontrolle", ["persönlichkeitsstörung", "borderline", "narziss", "histrion", "dissozial", "schizoid", "anankast", "zwanghafte persönlichkeit", "ängstlich", "vermeidend", "abhängige persönlichkeit", "impulskontroll", "pyromanie", "kleptomanie", "pathologisches spielen", "trichotillomanie", "transsexual", "paraphil", "pädophil", "fetisch", "persönlichkeit", "artifizielle", "münchhausen"]),
    ("F7–F9 Kinder, Jugend, Intelligenz", ["intelligenzminderung", "entwicklungsstörung", "autis", "asperger", "adhs", "aufmerksamkeitsdefizit", "hyperkinetisch", "enuresis", "enkopresis", "tic-störung", "tourette", "kindes", "kinder", "jugendliche", "legasthenie", "lese-rechtschreib", "stottern", "mutismus", "bindungsstörung", "sozialverhalten", "pica", "rett", "iq", "schulkind", "säugling"]),
    ("Psychopathologischer Befund", ["psychopathologisch", "befund", "bewusstsein", "orientierung", "formale denkstörung", "inhaltliche denkstörung", "gedankenabreißen", "perseveration", "ideenflucht", "affekt", "antrieb", "psychomotor", "stupor", "wahrnehmungsstörung", "illusion", "amdp", "aufmerksamkeit", "gedächtnis", "zerfahrenheit", "ambivalenz", "parathymie", "denkstörung", "vigilanz", "somnolenz", "sopor", "koma", "gedankendrängen", "grübeln", "neologism", "vorbeireden", "stereotyp", "echolalie", "katalepsie", "raptus", "logorrhö", "mutismus"]),
    ("Diagnostik & Klassifikation", ["icd", "dsm", "diagnos", "anamnese", "exploration", "testverfahren", "fragebogen", "klassifikation", "multiaxial", "komorbid", "mmst", "bdi", "hamilton", "prävalenz", "inzidenz", "epidemiolog", "selbstbeurteilung", "fremdbeurteilung", "reliabilität", "validität", "objektivität", "screening", "projektiv", "rorschach", "intelligenztest", "hawie", "leitlinie", "vulnerabilität", "triadisch"]),
    ("Therapieverfahren", ["psychoanaly", "verhaltenstherap", "kognitiv", "konditionierung", "systemisch", "gesprächspsychotherapie", "rogers", "freud", "adler", "jung", "übertragung", "gegenübertragung", "widerstand", "abwehrmechanism", "exposition", "desensibilisierung", "entspannung", "autogenes", "progressive muskel", "hypnose", "emdr", "dbt", "dialektisch", "schematherapie", "gestalttherapie", "psychodrama", "katathym", "imagination", "therapeut", "therapie", "verstärkung", "modelllernen", "sokratisch", "achtsamkeit", "acceptance", "rational-emotiv", "ellis", "beck", "sorkc", "konfrontation", "flooding", "token", "habituation", "löschung", "psychoedukation", "supervision", "setting", "abstinenz", "empathie", "kongruenz", "wertschätzung"]),
    ("Neurologie & Anatomie", ["nervensystem", "sympathikus", "parasympathikus", "gehirn", "hirn", "hypothalamus", "hypophyse", "limbisch", "neuron", "synapse", "neurotransmitter", "dopamin", "epilep", "anfall", "absence", "schlaganfall", "apoplex", "multiple sklerose", "hemipares", "aphasie", "apraxie", "agnosie", "hirnnerv", "liquor", "eeg", "mrt", "schilddrüse", "hyperthyre", "hypothyre", "cortisol", "hormon", "vegetativ", "pupille", "reflex", "kleinhirn", "großhirn", "thalamus", "hippocampus", "amygdala", "frontallappen", "temporallappen", "acetylcholin", "noradrenalin", "gaba", "glutamat", "migräne", "tremor", "lähmung", "meningitis", "enzephalitis", "phäochromozytom", "tumor"]),
]


def norm(s):
    s = unicodedata.normalize("NFKC", s).lower()
    s = re.sub(r"[^a-z0-9äöüß ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def qtext(q):
    return norm(q["stem"] + " " + " ".join(q.get("statements", [])))


def fulltext(q):
    return (q["stem"] + " " + " ".join(q.get("statements", [])) + " " + " ".join(q["options"].values())).lower()


def tag_topic(q):
    t = fulltext(q)
    scores = []
    for name, kws in TOPICS:
        sc = sum(t.count(k) for k in kws)
        scores.append((sc, name))
    best = max(scores)
    return best[1] if best[0] > 0 else "Sonstiges"


def other_keys():
    """Answer keys of other schools, group A. Returns {exam label: {source: {nr: letters}}}."""
    res = collections.defaultdict(dict)

    def frage_fmt(path, label, src, split="GRUPPE B"):
        t = "".join(p.get_text() for p in pymupdf.open(path))
        t = re.sub(r"[-‪-‮]", "", t)
        t = t.split(split)[0]
        d = {}
        for m in re.finditer(r"Frage\s*(\d+)\W+\s*([A-E](?:\s*\+?\s*[A-E]){0,2})\b", t):
            d.setdefault(int(m.group(1)), "".join(sorted(set(re.findall("[A-E]", m.group(2))))))
        res[label][src] = d

    frage_fmt(ROOT + "HPP-Loesungsschluessel-10_2024_neu-10.10.24.pdf", "Oktober 2024", "heilpraktiker-akademie.de", "Gruppe B")
    frage_fmt(ROOT + "HPP-Loesungsschluessel-03_2025_AB.pdf", "März 2025", "heilpraktiker-akademie.de")
    frage_fmt(ROOT + "ON.HPP_Pruefung-2024-03_Loesungsschluessel.pdf", "März 2024", "ON Lösungsschlüssel", "Gruppe B")
    frage_fmt(ROOT + "ON.HPP_Pruefung-2023-03_Loesungsschluessel.pdf", "März 2023", "ON Lösungsschlüssel", "Gruppe B")
    # Margit Allmeroth März 2025: table "N | letters" after "Lösungen (Gruppe A)"
    t = "".join(p.get_text() for p in pymupdf.open(ROOT + "HPP2025-03_v3.pdf")).split("Lösungen (Gruppe A)")[1]
    toks = [x.strip() for x in t.split("\n") if x.strip()]
    d = {}
    for i in range(len(toks) - 1):
        if toks[i].isdigit() and re.fullmatch(r"[A-E](,\s*[A-E])*", toks[i + 1]):
            d.setdefault(int(toks[i]), "".join(sorted(re.findall("[A-E]", toks[i + 1]))))
    res["März 2025"]["Margit Allmeroth"] = d
    return res


def encrypt(data_bytes, passphrase):
    # fixed salt: the app caches the derived key, so it must stay valid across data rebuilds
    salt = hashlib.sha256(b"hpp-trainer-static-salt-v1").digest()[:16]
    key = hashlib.pbkdf2_hmac("sha256", passphrase.encode(), salt, 200_000, dklen=32)
    iv = secrets.token_bytes(12)
    ct = AESGCM(key).encrypt(iv, data_bytes, None)
    return json.dumps({"v": 1, "kdf": "PBKDF2-SHA256", "iter": 200000,
                       "salt": base64.b64encode(salt).decode(), "iv": base64.b64encode(iv).decode(),
                       "ct": base64.b64encode(ct).decode()})


def main():
    official = json.load(open(os.path.join(OUT, "official.json")))
    husum = json.load(open(os.path.join(OUT, "husum.json")))
    lika = json.load(open(os.path.join(OUT, "likamundi_raw.json")))
    ocr = json.load(open(os.path.join(OUT, "ocr_answers.json")))
    begriffe = json.load(open(os.path.join(OUT, "begriffe.json")))
    cards = json.load(open(os.path.join(OUT, "cards.json")))
    report = []

    # --- other keys & disputes
    ok = other_keys()
    for q in official:
        for src, d in ok.get(q["exam"], {}).items():
            if q["nr"] in d and d[q["nr"]]:
                q["keys"][src] = d[q["nr"]]
        vals = set(q["keys"].values())
        q["disputed"] = len(vals) > 1
    nd = sum(q["disputed"] for q in official)
    report.append(f"official: {len(official)} questions, {nd} with disagreeing school keys")

    # --- explanations from Likamundi commented questions -> official questions
    off_idx = [(norm(fulltext(q)), q) for q in official]
    attached, xagree, xdis = 0, 0, []
    for lq in lika:
        if not lq.get("commented") or not lq.get("answer"):
            continue
        lt = norm(fulltext(lq))
        best = max(((difflib.SequenceMatcher(None, lt[:600], ot[:600]).ratio(), i) for i, (ot, _) in enumerate(off_idx)))
        if best[0] >= 0.9 and not off_idx[best[1]][1].get("expl_source"):
            oq = off_idx[best[1]][1]
            oq["expl"] = lq.get("expl", {}); oq["general"] = lq.get("general", ""); oq["expl_source"] = "Heilpraktikerschule Likamundi (kommentierte Originalfragen)"
            oq["keys"]["Likamundi"] = "".join(lq["answer"])
            lq["_official"] = oq["id"]
            attached += 1
            if sorted(lq["answer"]) == sorted(oq["answer"]):
                xagree += 1
            else:
                xdis.append((oq["id"], oq["answer"], lq["answer"]))
                oq["disputed"] = True
    report.append(f"explanations attached to official questions: {attached} (answers agree {xagree}, disagree {len(xdis)})")
    for x in xdis:
        report.append(f"   disagreement {x}")

    # --- Likamundi pool: only questions with an answer and 5 options, not duplicating an official question
    lika_out = []
    for lq in lika:
        ans = lq.get("answer") or (ocr.get(str(lq["lid"])) or {}).get("answer")
        if not ans or sorted(lq["options"]) != list("ABCDE") or lq.get("_official"):
            continue
        src = "Likamundi (kommentiert)" if lq.get("answer") else "Likamundi Prüfungstrainer (Screenshot/OCR)"
        note = (ocr.get(str(lq["lid"])) or {}).get("note", "")
        lika_out.append({
            "id": f"lika-{lq['lid']}", "pool": "likamundi", "exam": lq.get("title") or "Likamundi", "date": "", "nr": lq["lid"],
            "type": lq["type"], "stem": lq["stem"], "instruction": lq.get("instruction", ""), "statements": lq["statements"],
            "options": lq["options"], "numbered_options": False, "answer": sorted(ans), "keys": {src: "".join(sorted(ans))},
            "disputed": False, "expl": lq.get("expl", {}), "general": lq.get("general", "") or note,
            "expl_source": "Heilpraktikerschule Likamundi" if lq.get("expl") or note else "", "source": lq["source"],
        })
    report.append(f"likamundi: {len(lika_out)} answered questions in pool")

    # --- topics
    allq = official + husum + lika_out
    for q in allq:
        q["topic"] = tag_topic(q)
        q.setdefault("disputed", False); q.setdefault("expl", {}); q.setdefault("general", ""); q.setdefault("expl_source", "")
    tc = collections.Counter((q["pool"], q["topic"]) for q in allq)
    report.append("topics (official): " + ", ".join(f"{t}={n}" for (p, t), n in sorted(tc.items()) if p == "official"))

    # --- vocabulary quiz
    vocab = []
    for b in begriffe:
        a, d = b.get("Quiz: richtige Antwort", ""), b.get("Quiz: Distraktor", "")
        if a and d and b["term"]:
            vocab.append({"term": b["term"].strip(), "explanation": b.get("explanation", ""), "correct": a, "distractor": d,
                          "category": b.get("Kategorie/Bereich", ""), "mnemonic": b.get("Merkhilfe", ""), "seealso": b.get("siehe auch", "")})
    report.append(f"vocab: {len(vocab)} terms, cards: {len(cards)}")

    data = {"meta": {"built": __import__("datetime").date.today().isoformat(), "counts": {"official": len(official), "husum": len(husum), "likamundi": len(lika_out), "vocab": len(vocab), "cards": len(cards)},
                     "pass_mark": 21, "exam_size": 28},
            "questions": allq, "vocab": vocab, "cards": cards}
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    json.dump(data, open(os.path.join(OUT, "data.json"), "w"), ensure_ascii=False)
    pp = open(os.path.join(HERE, ".passphrase")).read().strip()
    os.makedirs(APP, exist_ok=True)
    open(os.path.join(APP, "data.enc"), "w").write(encrypt(raw, pp))
    report.append(f"data.json {len(raw)//1024} KB -> app/data.enc {os.path.getsize(os.path.join(APP, 'data.enc'))//1024} KB")
    # stamp data/app version into app.js and sw.js so caches refresh after a rebuild
    ver = hashlib.sha256(open(os.path.join(APP, "data.enc"), "rb").read() + open(os.path.join(APP, "app.js"), "rb").read()).hexdigest()[:10]
    for fn, pat, rep in (("app.js", r"const DATA_V = '[^']*'", f"const DATA_V = '{ver}'"), ("sw.js", r"const VERSION = '[^']*'", f"const VERSION = '{ver}'")):
        fp = os.path.join(APP, fn); txt = open(fp).read(); open(fp, "w").write(re.sub(pat, rep, txt))
    report.append(f"version stamp {ver}")
    print("\n".join(report))


if __name__ == "__main__":
    main()
