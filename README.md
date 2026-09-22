# HPP Trainer

Prüfungstrainer (PWA) für die schriftliche Heilpraktikerprüfung Psychotherapie. Statische Seite ohne Server,
Fortschritt liegt im Browser-Speicher des Geräts.

## Aufbau

- `app/` – die Web-App (index.html, app.js, styles.css, sw.js, manifest, Icons) und `data.enc`, die verschlüsselte Datendatei
- `pipeline/` – Python-Skripte, die die Fragen wortgleich aus den PDFs im Kursordner extrahieren und `app/data.enc` bauen

## Daten neu bauen

```bash
echo "<zugangscode>" > pipeline/.passphrase
pipeline/run_all.sh
```

Die Skripte lesen aus `/Users/sgeier/Projects/Phine-Lernen/HPP 2026/` (Pfad in den Skripten). `pipeline/ocr_all.sh` erzeugt
optional die OCR-Texte der Trainer-Screenshots (braucht `tesseract` und `pipeline/tessdata/deu.traineddata`).

## Warum verschlüsselt?

Die Fragen der Schulen (Likamundi, Husum) sind urheberrechtlich geschützt. Das Repository ist öffentlich (GitHub Pages),
deshalb liegt der Inhalt nur AES-verschlüsselt darin. Die App fragt einmalig den Zugangscode ab und merkt ihn sich lokal.

## Quellen der Lösungen

Es gibt keine amtlichen Lösungen. Die Schlüssel stammen von Institut Ehlert, heilpraktiker-akademie.de, ON, Margit Allmeroth
und Likamundi; wo sie sich widersprechen, markiert die App die Frage.
