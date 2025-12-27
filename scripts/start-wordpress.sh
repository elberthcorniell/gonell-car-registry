#!/bin/bash

# Start WordPress Docker instance for WooCommerce development
# Connects to your existing MySQL instance

set -e

# Default values (override with environment variables)
export WP_DB_USER=${WP_DB_USER:-root}
export WP_DB_PASSWORD=${WP_DB_PASSWORD:-root}
export WP_DB_NAME=${WP_DB_NAME:-wordpress}

echo "🚀 Starting WordPress container..."
echo "   DB Host: host.docker.internal:3306"
echo "   DB User: $WP_DB_USER"
echo "   DB Name: $WP_DB_NAME"
echo ""

# Create the database if it doesn't exist
echo "📦 Creating database '$WP_DB_NAME' if not exists..."
mysql -u"$WP_DB_USER" -p"$WP_DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $WP_DB_NAME;" 2>/dev/null || echo "   (Skipped - connect manually to create DB)"

# Start the container
cd "$(dirname "$0")/.."
docker compose -f docker-compose.wordpress.yml up -d

echo ""
echo "✅ WordPress is starting..."
echo ""
echo "📍 Access WordPress at: http://localhost:8080"
echo ""
echo "After WordPress is set up, install WooCommerce:"
echo "   1. Go to http://localhost:8080/wp-admin"
echo "   2. Plugins → Add New → Search 'WooCommerce'"
echo "   3. Install and activate"
echo ""
echo "To generate WooCommerce API keys:"
echo "   1. WooCommerce → Settings → Advanced → REST API"
echo "   2. Add Key → Description: 'Gestiono' → Permissions: Read/Write"
echo "   3. Copy Consumer Key and Consumer Secret"
echo ""
echo "To stop: docker compose -f docker-compose.wordpress.yml down"



