#!/bin/zsh
# Rebuild the app data from the course folder. Needs: python3 venv with requirements.txt, tesseract (only for OCR).
set -e
cd "$(dirname "$0")"
PY=${PY:-../.venv/bin/python}
if [ ! -x "$PY" ]; then python3 -m venv ../.venv && ../.venv/bin/pip install -q -r requirements.txt; fi
[ -f .passphrase ] || { echo "pipeline/.passphrase fehlt (Zugangscode der App)"; exit 1; }
$PY parse_official.py
$PY parse_husum.py
$PY parse_likamundi.py
$PY parse_begriffe.py
[ -d ocr ] && $PY match_ocr.py || echo '{}' > out/ocr_answers.json
$PY build_data.py
