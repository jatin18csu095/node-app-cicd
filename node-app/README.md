openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
-keyout key.pem -out cert.pem \
-subj "/C=IN/ST=Delhi/L=Delhi/O=GIFT/OU=POC/CN=gift-poc-alb-1882230025.ap-south-1.elb.amazonaws.com"