# DesignLibre Deployment Package

Version: 0.1.0

## Contents

```
deploy/
├── dist/                    # Built application files
│   ├── index.html
│   ├── assets/
│   ├── images/
│   ├── wasm/
│   └── auth/
├── nginx-designlibre.conf   # Nginx configuration
├── install.sh               # Automated installation script
└── README.md                # This file
```

## Quick Installation (Rocky Linux / RHEL / CentOS)

```bash
# Transfer the package to your server
scp -r deploy/ user@your-server:/tmp/designlibre/

# SSH into your server
ssh user@your-server

# Run the installation script
cd /tmp/designlibre
sudo ./install.sh
```

## Manual Installation

### 1. Install Nginx

```bash
sudo dnf install -y epel-release
sudo dnf install -y nginx
```

### 2. Create Web Directory

```bash
sudo mkdir -p /var/www/designlibre
sudo cp -r dist/* /var/www/designlibre/
sudo chown -R nginx:nginx /var/www/designlibre
sudo chmod -R 755 /var/www/designlibre
```

### 3. Configure Nginx

```bash
sudo cp nginx-designlibre.conf /etc/nginx/conf.d/
# Edit to set your domain/IP
sudo nano /etc/nginx/conf.d/designlibre.conf
```

### 4. Configure SELinux (if enabled)

```bash
sudo semanage fcontext -a -t httpd_sys_content_t "/var/www/designlibre(/.*)?"
sudo restorecon -Rv /var/www/designlibre
```

### 5. Configure Firewall

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 6. Start Nginx

```bash
sudo nginx -t                  # Test configuration
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Configuration

### Change Domain/IP

Edit `/etc/nginx/conf.d/designlibre.conf`:

```nginx
server_name your-domain.com;  # or your server IP
```

### Enable HTTPS (Recommended)

```bash
# Install certbot
sudo dnf install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

## Important Notes

### COOP/COEP Headers

DesignLibre requires Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers for WebAssembly features. These are configured in the nginx config.

### Browser Requirements

- Chrome 92+ / Edge 92+
- Firefox 90+
- Safari 15.2+

WebGL 2.0 support required.

## Troubleshooting

### Check nginx status
```bash
sudo systemctl status nginx
```

### View logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Test COOP/COEP headers
```bash
curl -I http://localhost/
# Should see:
# Cross-Origin-Opener-Policy: same-origin
# Cross-Origin-Embedder-Policy: require-corp
```

### SELinux issues
```bash
# Check for denials
sudo ausearch -m avc -ts recent

# Temporarily set permissive (for testing only)
sudo setenforce 0
```

## Updates

To update DesignLibre:

```bash
# Build new version (on dev machine)
npm run build

# Transfer new dist
scp -r dist/* user@server:/var/www/designlibre/

# Clear browser cache and refresh
```
