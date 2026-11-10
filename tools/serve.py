"""Local preview server for the site that tells the browser never to cache, so every reload shows the latest files.

    python -I tools/serve.py site 8080
"""
import functools, http.server, sys

root = sys.argv[1] if len(sys.argv) > 1 else 'site'
port = int(sys.argv[2]) if len(sys.argv) > 2 else 8080


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def send_head(self):
        # drop conditional headers so the browser always gets a fresh 200, never a 304 for an old copy
        for h in ('If-Modified-Since', 'If-None-Match'):
            if h in self.headers: del self.headers[h]
        return super().send_head()


handler = functools.partial(NoCache, directory=root)
with http.server.ThreadingHTTPServer(('127.0.0.1', port), handler) as srv:
    print('Serving %s on http://localhost:%d (no cache)' % (root, port), flush=True)
    srv.serve_forever()
