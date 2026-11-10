"""Switch the site between the original look and the Mint Signal theme.

    python -I tools/set-theme.py site mint       # turn the Mint Signal theme on
    python -I tools/set-theme.py site original   # back to the original look

Only the <link> tags in the five HTML pages change; site.css / styles-services.css are never touched.
For "mint" it first regenerates site.mint.css + styles-services.mint.css with tools/mint-theme.py.
"""
import hashlib, os, re, subprocess, sys

root, theme = sys.argv[1], sys.argv[2]
assert theme in ('mint', 'original'), 'theme must be "mint" or "original"'
pages = ['index.html', 'diagnostika/index.html', 'monitoringas/index.html', 'servisas/index.html', '404.html']

if theme == 'mint':
    subprocess.run([sys.executable, '-I', os.path.join(os.path.dirname(__file__), 'mint-theme.py'), root], check=True)


def ver(name):
    return hashlib.md5(open(os.path.join(root, name), 'rb').read()).hexdigest()[:8]


FONT = ('<!--theme-font--><link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">')
FONT_RE = re.compile(r'<!--theme-font-->[^\n]*\n?')
CSS_RE = re.compile(r'href="(/?)(site|styles-services)(?:\.mint)?\.css\?v=[0-9a-f]+"')

for p in pages:
    path = os.path.join(root, p)
    s = FONT_RE.sub('', open(path, encoding='utf-8').read())
    suffix = '.mint' if theme == 'mint' else ''
    s = CSS_RE.sub(lambda m: 'href="%s%s%s.css?v=%s"' % (m.group(1), m.group(2), suffix, ver(m.group(2) + suffix + '.css')), s)
    if theme == 'mint' and 'Plus Jakarta Sans' in open(os.path.join(root, 'site.mint.css'), encoding='utf-8').read():
        s = re.sub(r'(<link rel="stylesheet" href="/?site\.mint\.css[^>]*>)', lambda m: FONT + '\n' + m.group(1), s, count=1)
    open(path, 'w', encoding='utf-8', newline='').write(s)
    print(p, '->', theme)
