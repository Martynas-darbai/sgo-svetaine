"""Generate the "Mint Signal" theme versions of the site CSS.

    python -I tools/mint-theme.py site

Reads   site/site.css, site/styles-services.css   (the originals, never modified)
Writes  site/site.mint.css, site/styles-services.mint.css

What changes in the mint copies:
  * every green / teal colour moves to the Mint Signal palette (primary #51f0a8)
  * the sans-serif font becomes "Plus Jakarta Sans" (IBM Plex Mono stays)
  * white primary buttons become mint with black text
  * dark card greys move to the theme card colour #0a0a0a, muted grey text to #969696
  * colours hard-coded in HTML SVG attributes are overridden with attribute selectors
  * CSS variables (--theme-*) tell aurora.js / splash.js which palette to use

Re-run after editing site.css or styles-services.css so the mint copies stay in sync.
"""
import colorsys, os, re, sys

root = sys.argv[1] if len(sys.argv) > 1 else 'site'

# The user kept the original fonts (IBM Plex Sans etc.) and only the mint colours (2026-11-09).
# Set to True to also switch the sans-serif font to "Plus Jakarta Sans" (set-theme.py then adds the Google Fonts link).
USE_THEME_FONT = False

MINT = (81, 240, 168)                     # --primary #51f0a8
EXACT = {                                  # hand-picked mappings (rgb -> rgb)
    (32, 183, 138): MINT,                  # brand green #20B78A
    (25, 201, 142): MINT,                  # #19C98E
    (31, 184, 148): MINT,                  # #1FB894
    (11, 122, 106): (33, 106, 73),         # #0B7A6A  -> --secondary #216a49
    (123, 234, 107): (158, 255, 161),      # #7BEA6B  -> chart-2 #9effa1
    (74, 222, 128): (126, 254, 143),       # #4ADE80  -> #7efe8f
    (13, 128, 92): (33, 168, 106),         # #0d805c  darker mint
    (26, 158, 120): (60, 214, 146),        # #1a9e78
}
CARD = {(20, 20, 20): (10, 10, 10), (23, 23, 23): (10, 10, 10)}   # #141414 #171717 -> --card #0a0a0a
MUTED = {(163, 163, 163): (150, 150, 150)}                          # #a3a3a3 -> --muted-foreground #969696


def remap(rgb):
    if rgb in EXACT: return EXACT[rgb]
    if rgb in CARD: return CARD[rgb]
    if rgb in MUTED: return MUTED[rgb]
    r, g, b = (c / 255 for c in rgb)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    hd = h * 360
    if not (130 <= hd <= 192 and s > 0.25 and 0.08 < l < 0.92):
        return rgb                         # not a green/teal: leave alone
    hd = 153 + (hd - 162) * 0.5            # pull the hue towards mint, keep some teal variety
    s = min(1.0, s * 1.15)
    l = min(0.86, l * (1.5 if l >= 0.3 else 1.2))
    r, g, b = colorsys.hls_to_rgb((hd % 360) / 360, l, s)
    return tuple(max(0, min(255, round(c * 255))) for c in (r, g, b))


def hex_of(rgb): return '#%02x%02x%02x' % rgb


def sub_hex(m):
    t = m.group(1)
    if len(t) == 3: t = ''.join(c * 2 for c in t)
    rgb = tuple(int(t[i:i + 2], 16) for i in (0, 2, 4))
    new = remap(rgb)
    return m.group(0) if new == rgb else hex_of(new)


def sub_rgb(m):
    rgb = tuple(int(m.group(i)) for i in (2, 3, 4))
    new = remap(rgb)
    if new == rgb: return m.group(0)
    return '%s(%d,%d,%d' % (m.group(1), *new)


HEX = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])')
RGB = re.compile(r'(rgba?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)')
FONT_DECL = re.compile(r'(font(?:-family)?\s*:)([^;}]*)')
SANS = re.compile(r'"IBM Plex Sans"|\'IBM Plex Sans\'|"Inter"|\'Inter\'|"Archivo"|\'Archivo\'|\b(?<!-)Inter\b(?![\w-])')
FONTFACE = re.compile(r'@font-face\s*\{[^}]*\}')
WHITE_BG = re.compile(r'(background(?:-color)?\s*:\s*)(#fff\b|#ffffff\b|#FFF\b|white\b)')
HOVER_BG = re.compile(r'(background(?:-color)?\s*:\s*)(#f2f2f2\b|#ededed\b|#e8e8e8\b|#f5f5f5\b|#eeeeee\b|#eee\b|#f0f0f0\b)', re.I)
MINT_BG = re.compile(r'background(?:-color)?\s*:\s*#(51f0a8|44e09c)\b', re.I)
LIGHT_TEXT = re.compile(r'((?:^|[;{\s])color\s*:\s*)(#fff\b|#ffffff\b|white\b)', re.I)
DARK_TEXT = re.compile(r'(?:^|[;{\s])color\s*:\s*(#111\b|#111111\b|#000\b|#000000\b|#0a0a0a\b|#141414\b|#171717\b)')


def convert_css(src):
    faces = []
    src = FONTFACE.sub(lambda m: (faces.append(m.group(0)), '\0FACE%d\0' % (len(faces) - 1))[1], src)
    src = HEX.sub(sub_hex, src)
    src = RGB.sub(sub_rgb, src)
    if USE_THEME_FONT:
        src = FONT_DECL.sub(lambda m: m.group(1) + SANS.sub('"Plus Jakarta Sans"', m.group(2)), src)

    # white button + dark text in the same rule -> mint button (light hover greys -> slightly deeper mint);
    # anything that ends up on a solid mint background gets black text (--primary-foreground)
    def fix_rule(m):
        body = m.group(2)
        if DARK_TEXT.search(body):
            if WHITE_BG.search(body):
                body = WHITE_BG.sub(lambda b: b.group(1) + '#51f0a8', body)
            body = HOVER_BG.sub(lambda b: b.group(1) + '#44e09c', body)
        if MINT_BG.search(body):
            body = LIGHT_TEXT.sub(lambda c: c.group(1) + '#000', body)
        return m.group(1) + body + '}'
    src = re.sub(r'(\{)([^{}]*)\}', fix_rule, src)

    src = re.sub('\0FACE(\\d+)\0', lambda m: faces[int(m.group(1))], src)
    return src


THEME_VARS = (
    '\n/* ---- Mint Signal theme: palette for the JS-drawn effects + HTML SVG attribute colours ---- */\n'
    ':root{--theme-name:mint;--theme-aurora:#216a49,#51f0a8,#9effa1,#51f0a8,#216a49;'
    '--theme-splash:#2fc785,#51f0a8,#7efe8f,#9effa1,#51f0a8;--theme-glow-rgb:81,240,168;'
    '--background:#000;--foreground:#f0f0f0;--primary:#51f0a8;--primary-foreground:#000;--card:#0a0a0a;'
    '--border:#19191a;--muted-foreground:#969696;--accent:#093723;--secondary:#216a49;--radius:1.4rem}\n'
    + ('body{font-family:"Plus Jakarta Sans",system-ui,sans-serif}\n' if USE_THEME_FONT else '')
)


def svg_attr_overrides(html_files):
    """HTML SVGs with fill/stroke/stop-color attributes in brand green -> CSS overrides (CSS beats attributes)."""
    rules = {}
    pat = re.compile(r'\b(fill|stroke|stop-color)="([^"]+)"')
    for f in html_files:
        for attr, val in pat.findall(open(f, encoding='utf-8').read()):
            new = RGB.sub(sub_rgb, HEX.sub(sub_hex, val))
            if new != val:
                rules['[%s="%s"]' % (attr, val)] = '%s:%s' % (attr, new)
    return ''.join('%s{%s}\n' % (sel, decl) for sel, decl in sorted(rules.items()))


html = [os.path.join(root, p) for p in ('index.html', 'diagnostika/index.html', 'monitoringas/index.html',
                                         'servisas/index.html', '404.html')]
for name in ('site.css', 'styles-services.css'):
    src = open(os.path.join(root, name), encoding='utf-8').read()
    out = convert_css(src)
    if name == 'site.css':
        out += THEME_VARS + svg_attr_overrides(html)
    dst = os.path.join(root, name.replace('.css', '.mint.css'))
    open(dst, 'w', encoding='utf-8', newline='').write(out)
    print('%s -> %s' % (name, os.path.basename(dst)))
