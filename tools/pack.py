"""Pack the site for upload (Hostinger: extract inside public_html).

    python -I tools/pack.py site sgo-svetaine-hostinger.zip

Files sit at the zip root (index.html, assets/, ...), with forward-slash paths so it extracts correctly on Linux.
Leaves out the unused Mint theme copies (*.mint.css).
"""
import os, sys, zipfile

root, out = sys.argv[1], sys.argv[2]
skip_suffix = ('.mint.css',)
n = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        for name in sorted(filenames):
            if name.endswith(skip_suffix):
                continue
            full = os.path.join(dirpath, name)
            arc = os.path.relpath(full, root).replace(os.sep, '/')
            z.write(full, arc)
            n += 1
print('%d files -> %s (%.1f MB)' % (n, out, os.path.getsize(out) / 1e6))
