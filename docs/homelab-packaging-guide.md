# DesignLibre Homelab Packaging Guide

This document describes how to build and package DesignLibre for deployment to a homelab server.

## Prerequisites

On your development machine:
- Node.js 18+ and npm
- Git

## Step 1: Ensure Clean Build

First, ensure all changes are committed and the project builds successfully:

```bash
cd /home/john/projects/designlibre

# Check for uncommitted changes
git status

# Install dependencies (if needed)
npm install

# Run the production build
npm run build
```

The build output will be in `dist/`:
```
dist/
├── index.html
├── assets/
│   ├── main-*.css
│   ├── main-*.js
│   └── index-*.js
├── images/
├── auth/
└── wasm/
```

## Step 2: Prepare Deployment Directory

Create a clean deployment package with all necessary files:

```bash
# Create deployment directory
mkdir -p deploy/designlibre-deploy/app

# Copy built application
cp -r dist/* deploy/designlibre-deploy/app/

# Copy deployment scripts and configs
cp deploy/nginx-designlibre.conf deploy/designlibre-deploy/
cp deploy/generate-ssl-cert.sh deploy/designlibre-deploy/
cp deploy/DEPLOY-INSTRUCTIONS.md deploy/designlibre-deploy/
```

## Step 3: Create Landing Page (Optional)

If you want a landing page at the root that redirects to the app:

```bash
cat > deploy/designlibre-deploy/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=/app/">
    <title>DesignLibre</title>
</head>
<body>
    <p>Redirecting to <a href="/app/">DesignLibre</a>...</p>
</body>
</html>
EOF
```

## Step 4: Verify Package Contents

Check that all required files are present:

```bash
tree deploy/designlibre-deploy/
```

Expected structure:
```
deploy/designlibre-deploy/
├── index.html                    # Landing page redirect
├── nginx-designlibre.conf        # Nginx configuration
├── generate-ssl-cert.sh          # SSL certificate generator
├── DEPLOY-INSTRUCTIONS.md        # Server-side instructions
└── app/
    ├── index.html                # Main application
    ├── assets/
    │   ├── main-*.css
    │   ├── main-*.js
    │   └── *.js.map
    ├── images/
    │   └── designlibre-logos.png
    ├── auth/
    │   └── callback/
    │       └── index.html
    └── wasm/
```

## Step 5: Create Tarball

Package everything into a compressed tarball:

```bash
cd deploy

# Create tarball
tar -czvf designlibre-deploy.tar.gz designlibre-deploy/

# Verify tarball contents
tar -tzvf designlibre-deploy.tar.gz | head -20

# Check file size
ls -lh designlibre-deploy.tar.gz
```

## Step 6: Verify Package Integrity

Before transferring, verify the package:

```bash
# Check tarball is not corrupted
gzip -t designlibre-deploy.tar.gz && echo "Tarball OK"

# Get checksum for verification after transfer
sha256sum designlibre-deploy.tar.gz
```

Save the checksum to verify the file wasn't corrupted during transfer.

## Quick One-Liner

To rebuild and repackage everything in one command:

```bash
cd /home/john/projects/designlibre && \
npm run build && \
rm -rf deploy/designlibre-deploy && \
mkdir -p deploy/designlibre-deploy/app && \
cp -r dist/* deploy/designlibre-deploy/app/ && \
cp deploy/nginx-designlibre.conf deploy/designlibre-deploy/ && \
cp deploy/generate-ssl-cert.sh deploy/designlibre-deploy/ && \
cp deploy/DEPLOY-INSTRUCTIONS.md deploy/designlibre-deploy/ && \
cd deploy && \
tar -czvf designlibre-deploy.tar.gz designlibre-deploy/
```

## Package Ready

The deployment package is now ready at:
```
/home/john/projects/designlibre/deploy/designlibre-deploy.tar.gz
```

## Next Steps

Transfer the package to your homelab server (see separate transfer documentation).
