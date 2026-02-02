# DesignLibre Deployment Instructions

## Production Deployment (designlibre.app.practicallyzen.com)

### Package Contents

- `designlibre-deploy-20260111.tar.gz` - Production build (2.3MB)
- `nginx-production.conf` - Nginx configuration for production

### Step 1: Copy Package to Server

```bash
scp deploy/designlibre-deploy-20260111.tar.gz user@your-server:~/
scp deploy/nginx-production.conf user@your-server:~/
```

### Step 2: Extract and Deploy on Server

SSH into your server and run:

```bash
# Create web directory
sudo mkdir -p /var/www/designlibre

# Extract the archive
cd /var/www/designlibre
sudo tar -xzf ~/designlibre-deploy-20260111.tar.gz

# Set permissions
sudo chown -R www-data:www-data /var/www/designlibre
sudo chmod -R 755 /var/www/designlibre
```

### Step 3: SSL Certificate (Let's Encrypt)

If you don't have a certificate yet:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx  # Debian/Ubuntu
# OR
sudo dnf install certbot python3-certbot-nginx  # Rocky/RHEL

# Get certificate
sudo certbot --nginx -d designlibre.app.practicallyzen.com
```

### Step 4: Configure Nginx

```bash
# Copy nginx config
sudo cp ~/nginx-production.conf /etc/nginx/conf.d/designlibre-app.conf

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 5: Verify Deployment

Open https://designlibre.app.practicallyzen.com/ in your browser.

---

## Important: Cross-Origin Headers

DesignLibre uses SharedArrayBuffer for WebAssembly features. The nginx config includes required headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without these headers, some features may not work.

---

## Quick Deploy Script

```bash
#!/bin/bash
# Run on your server after copying files

sudo mkdir -p /var/www/designlibre
cd /var/www/designlibre
sudo tar -xzf ~/designlibre-deploy-20260111.tar.gz
sudo chown -R www-data:www-data /var/www/designlibre
sudo cp ~/nginx-production.conf /etc/nginx/conf.d/designlibre-app.conf
sudo nginx -t && sudo systemctl reload nginx
echo "Deployed! Visit https://designlibre.app.practicallyzen.com/"
```

---

## Troubleshooting

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Verify Files
```bash
ls -la /var/www/designlibre/
```

### Check Headers (from your local machine)
```bash
curl -I https://designlibre.app.practicallyzen.com/
```

Should show:
```
cross-origin-opener-policy: same-origin
cross-origin-embedder-policy: require-corp
```

---

## Local Development Deployment (192.168.100.27)

For local testing with self-signed certificates, see `nginx-designlibre.conf` and `generate-ssl-cert.sh`.
