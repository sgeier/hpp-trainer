#!/bin/zsh
# OCR every screenshot under the Prüfungsfragen tree into pipeline/ocr/<flattened name>.txt
P=/Users/sgeier/Projects/Phine-Lernen/hpp-trainer/pipeline
SRC="/Users/sgeier/Projects/Phine-Lernen/HPP 2026/Prüfungsfragen"
mkdir -p "$P/ocr"
cd "$SRC" || exit 1
find . -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) | sort > "$P/ocr_list.txt"
ocr_one() {
  f="$1"
  out="$P/ocr/$(echo "$f" | sed 's#^\./##; s#[/ ]#_#g').txt"
  [ -s "$out" ] && return 0
  TESSDATA_PREFIX="$P/tessdata" tesseract "$f" "${out%.txt}" -l deu --psm 4 >/dev/null 2>&1
}
export -f ocr_one 2>/dev/null
N=0
while IFS= read -r f; do
  ocr_one "$f" &
  N=$((N+1))
  if (( N % 6 == 0 )); then wait; fi
done < "$P/ocr_list.txt"
wait
echo "OCR DONE: $(ls "$P/ocr" | wc -l | tr -d ' ') of $(wc -l < "$P/ocr_list.txt" | tr -d ' ')" | tee "$P/ocr_done.txt"
