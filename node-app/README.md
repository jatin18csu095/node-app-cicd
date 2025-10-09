openssl req -x509 -nodes -newkey rsa:2048 -days 7 \
-keyout key.pem -out cert.pem \
-subj "/C=IN/ST=Delhi/L=Delhi/O=GiftPOC/OU=POC/CN=gift-poc.local"