#!/bin/bash

# 🚀 BT Community - Production Deployment Script
# This script will build and deploy your app to production

echo "🚀 Starting production deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Build the application
echo "🔨 Building production version..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed! dist folder not found."
    exit 1
fi

echo "✅ Build completed successfully!"

# Create production files
echo "📁 Creating production files..."

# Create .htaccess for Apache
cat > dist/.htaccess << 'EOF'
# Enable CORS for Telegram Mini App
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Telegram-User-Id"

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"

# Cache static assets
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, immutable"
</FilesMatch>

# Handle SPA routing
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOF

# Create robots.txt
cat > dist/robots.txt << 'EOF'
User-agent: *
Disallow: /admin/
Disallow: /api/
Allow: /
EOF

# Create sitemap.xml
cat > dist/sitemap.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://your-domain.com/</loc>
        <lastmod>2024-01-01</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://your-domain.com/tasks</loc>
        <lastmod>2024-01-01</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>https://your-domain.com/referrals</loc>
        <lastmod>2024-01-01</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>https://your-domain.com/wallet</loc>
        <lastmod>2024-01-01</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
</urlset>
EOF

echo "✅ Production files created!"

# Show deployment info
echo ""
echo "🎉 Production build completed!"
echo ""
echo "📁 Files are ready in the 'dist' folder"
echo "🚀 Deploy these files to your web server"
echo ""
echo "📋 Next steps:"
echo "1. Upload 'dist' folder contents to your web server"
echo "2. Configure your domain with SSL certificate"
echo "3. Set up Telegram bot with your domain"
echo "4. Test the app in Telegram"
echo ""
echo "🔗 Useful files:"
echo "- dist/index.html (main app)"
echo "- dist/.htaccess (Apache configuration)"
echo "- dist/robots.txt (SEO)"
echo "- dist/sitemap.xml (SEO)"
echo ""
echo "📞 Need help? Check the deployment guides:"
echo "- TELEGRAM_MINI_APP_GUIDE.md"
echo "- telegram-bot-setup.md"
echo "- PRODUCTION_DEPLOYMENT_GUIDE.md" 