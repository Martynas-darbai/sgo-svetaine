# SGO svetainė (sgo.lt)

Saulės elektrinių monitoringo, diagnostikos ir serviso svetainė. Statinis HTML/CSS/JS + vienas PHP failas kontaktų formai.

## Struktūra

| Kelias | Kas tai |
|---|---|
| `site/` | Pati svetainė — tai, kas įkeliama į hostingą |
| `site/index.html` | Pagrindinis puslapis |
| `site/monitoringas/`, `site/diagnostika/`, `site/servisas/` | Paslaugų puslapiai |
| `site/404.html` | Puslapis neegzistuojantiems adresams |
| `site/site.css`, `site/styles-services.css` | Stiliai |
| `site/*.js` | Animacijos ir interaktyvumas (aurora, orbita, paslaugų pavyzdžiai ir kt.) |
| `site/send-mail.php` | Kontaktų forma — siunčia laišką į `info@sgo.lt` |
| `site/.htaccess` | 404 puslapis ir naršyklės talpyklos nustatymai (Apache / LiteSpeed) |
| `site/*.mint.css` | Nenaudojama alternatyvi „Mint Signal“ spalvų tema (žr. žemiau) |
| `tools/` | Pagalbiniai skriptai (Python 3) |

## Įkėlimas į Hostinger

```bash
python -I tools/pack.py site sgo-svetaine-hostinger.zip
```

Sukurtą zip įkelti į `public_html` ir išskleisti (failai zip'e jau šaknyje). Mint temos failai į zip nededami.

Kontaktų formai reikia, kad hostinge būtų sukurta `info@sgo.lt` pašto dėžutė (laiškai siunčiami iš jos).

## Peržiūra kompiuteryje

```bash
python -I tools/serve.py site 8080
```

Atidaryti http://localhost:8080. Serveris neleidžia naršyklei laikyti senų versijų. Kontaktų forma vietoje neveikia (reikia PHP).

## Versijų žymės

CSS/JS nuorodos HTML'e turi `?v=...` žymes. Pakeitus failą, žymę reikia atnaujinti (pvz. pirmi 8 md5 simboliai), kitaip lankytojų naršyklės gali rodyti seną versiją.

## Mint Signal tema (neprivaloma)

```bash
python -I tools/set-theme.py site mint       # įjungti
python -I tools/set-theme.py site original   # grąžinti originalą (dabar naudojama)
```

Originalūs `site.css` / `styles-services.css` niekada nekeičiami — tema sugeneruojama į `*.mint.css` (`tools/mint-theme.py`).
