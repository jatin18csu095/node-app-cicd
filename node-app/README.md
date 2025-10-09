openssl req -x509 -nodes -newkey rsa:2048 -days 7 \
-keyout key.pem -out cert.pem -subj "/CN=gift-poc.local"