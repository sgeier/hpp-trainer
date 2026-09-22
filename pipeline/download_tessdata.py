import urllib.request, os, sys
dst = os.path.join(os.path.dirname(__file__), "tessdata", "deu.traineddata")
os.makedirs(os.path.dirname(dst), exist_ok=True)
if not os.path.exists(dst) or os.path.getsize(dst) < 1_000_000:
    urllib.request.urlretrieve("https://github.com/tesseract-ocr/tessdata_best/raw/main/deu.traineddata", dst)
print("deu.traineddata", os.path.getsize(dst) // 1024, "KB")
