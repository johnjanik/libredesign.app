#!/bin/bash
# DesignLibre Installation Script for Rocky Linux
# Run as root or with sudo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DesignLibre Installation Script${NC}"
echo -e "${GREEN}  Rocky Linux / RHEL / CentOS${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Configuration
INSTALL_DIR="/var/www/designlibre"
NGINX_CONF="/etc/nginx/conf.d/designlibre.conf"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}Step 1: Installing prerequisites...${NC}"
dnf install -y epel-release
dnf install -y nginx

echo -e "${YELLOW}Step 2: Creating web directory...${NC}"
mkdir -p "$INSTALL_DIR"

echo -e "${YELLOW}Step 3: Copying application files...${NC}"
if [ -d "$SCRIPT_DIR/dist" ]; then
    cp -r "$SCRIPT_DIR/dist/"* "$INSTALL_DIR/"
    echo -e "${GREEN}Files copied from dist/${NC}"
else
    echo -e "${RED}Warning: dist/ directory not found in $SCRIPT_DIR${NC}"
    echo -e "${YELLOW}Please copy the built files to $INSTALL_DIR manually${NC}"
fi

echo -e "${YELLOW}Step 4: Setting permissions...${NC}"
chown -R nginx:nginx "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"

echo -e "${YELLOW}Step 5: Installing nginx configuration...${NC}"
if [ -f "$SCRIPT_DIR/nginx-designlibre.conf" ]; then
    cp "$SCRIPT_DIR/nginx-designlibre.conf" "$NGINX_CONF"
    echo -e "${GREEN}Nginx config installed${NC}"
else
    echo -e "${RED}Warning: nginx-designlibre.conf not found${NC}"
fi

echo -e "${YELLOW}Step 6: Configuring SELinux...${NC}"
if command -v getenforce &> /dev/null && [ "$(getenforce)" != "Disabled" ]; then
    # Allow nginx to serve from /var/www/designlibre
    semanage fcontext -a -t httpd_sys_content_t "$INSTALL_DIR(/.*)?" 2>/dev/null || true
    restorecon -Rv "$INSTALL_DIR"

    # Allow nginx to make network connections (if needed for proxying)
    setsebool -P httpd_can_network_connect 1 2>/dev/null || true

    echo -e "${GREEN}SELinux contexts configured${NC}"
else
    echo -e "${YELLOW}SELinux is disabled or not available${NC}"
fi

echo -e "${YELLOW}Step 7: Configuring firewall...${NC}"
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    echo -e "${GREEN}Firewall configured${NC}"
else
    echo -e "${YELLOW}firewalld not found, skipping firewall configuration${NC}"
fi

echo -e "${YELLOW}Step 8: Testing nginx configuration...${NC}"
nginx -t

echo -e "${YELLOW}Step 9: Starting nginx...${NC}"
systemctl enable nginx
systemctl restart nginx

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "DesignLibre installed to: ${YELLOW}$INSTALL_DIR${NC}"
echo -e "Nginx config: ${YELLOW}$NGINX_CONF${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update server_name in $NGINX_CONF to match your domain/IP"
echo "2. Access the app at http://your-server-ip/"
echo "3. (Optional) Configure SSL with certbot for HTTPS"
echo ""
echo -e "${YELLOW}To configure SSL with Let's Encrypt:${NC}"
echo "  dnf install certbot python3-certbot-nginx"
echo "  certbot --nginx -d your-domain.com"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  tail -f /var/log/nginx/access.log"
echo "  tail -f /var/log/nginx/error.log"
