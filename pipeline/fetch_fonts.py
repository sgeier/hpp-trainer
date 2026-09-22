"""Download the app's web fonts (Fraunces, Manrope) from Google Fonts as self-hosted woff2 files (latin subset).
Writes app/fonts/*.woff2 and app/fonts/fonts.css so the PWA works offline without third-party requests."""
import re, os, ssl, urllib.request, certifi

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app")
FONTS = os.path.join(APP, "fonts")
os.makedirs(FONTS, exist_ok=True)
CSS_URL = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600..700&family=Manrope:wght@400..800&display=swap"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
ctx = ssl.create_default_context(cafile=certifi.where())


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx) as r:
        return r.read()


css = get(CSS_URL).decode()
out = []
for block in re.findall(r"/\* (\w+) \*/\s*@font-face \{(.*?)\}", css, re.S):
    subset, body = block
    if subset != "latin":
        continue
    fam = re.search(r"font-family: '([^']+)'", body)[1]
    style = re.search(r"font-style: (\w+)", body)[1]
    weight = re.search(r"font-weight: ([\d ]+)", body)[1].strip()
    url = re.search(r"url\((https://[^)]+)\)", body)[1]
    fname = f"{fam.lower()}-{weight.replace(' ', '-')}-{style}.woff2"
    open(os.path.join(FONTS, fname), "wb").write(get(url))
    extra = ""
    if fam == "Fraunces":
        extra = "  font-variation-settings: 'opsz' 48;\n"
    out.append(f"@font-face {{\n  font-family: '{fam}';\n  font-style: {style};\n  font-weight: {weight};\n  font-display: swap;\n  src: url({fname}) format('woff2');\n}}")
    print("fetched", fname, os.path.getsize(os.path.join(FONTS, fname)) // 1024, "KB")
open(os.path.join(FONTS, "fonts.css"), "w").write("\n".join(out) + "\n")
print("fonts.css written with", len(out), "faces")
