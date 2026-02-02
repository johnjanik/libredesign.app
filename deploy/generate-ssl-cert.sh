#!/bin/bash
# Generate self-signed SSL certificate for DesignLibre

CERT_DIR="/etc/nginx/ssl"
DOMAIN="192.168.100.27"

# Create directory for certificates
sudo mkdir -p "$CERT_DIR"

# Generate private key and self-signed certificate (valid for 365 days)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/designlibre.key" \
    -out "$CERT_DIR/designlibre.crt" \
    -subj "/C=US/ST=Local/L=Homelab/O=DesignLibre/CN=$DOMAIN" \
    -addext "subjectAltName=IP:$DOMAIN"

# Set proper permissions
sudo chmod 600 "$CERT_DIR/designlibre.key"
sudo chmod 644 "$CERT_DIR/designlibre.crt"

echo "SSL certificate generated at:"
echo "  Certificate: $CERT_DIR/designlibre.crt"
echo "  Private Key: $CERT_DIR/designlibre.key"
