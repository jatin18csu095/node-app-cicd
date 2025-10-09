#!/bin/bash
cat >/opt/header_server.py <<'PY'
from http.server import BaseHTTPRequestHandler, HTTPServer
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/plain')
        self.end_headers()
        self.wfile.write(b'GIFT POC - Auth via Cognito through ALB\n\nHeaders Received:\n')
        for k, v in self.headers.items():
            self.wfile.write(f'{k}: {v}\n'.encode())
        self.wfile.write(b"\nTip: Look for 'x-amzn-oidc-identity' and 'x-amzn-oidc-data'\n")
HTTPServer(('', 80), H).serve_forever()
PY
nohup python3 /opt/header_server.py >/var/log/header_server.log 2>&1 &