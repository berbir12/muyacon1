#!/bin/bash

# Muyacon Webhook Server Deployment Script

echo "🚀 Deploying Muyacon Webhook Server..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel first:"
    vercel login
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

# Get the deployment URL
DEPLOYMENT_URL=$(vercel ls | grep "webhook-server" | head -1 | awk '{print $2}')
echo "✅ Deployment complete!"
echo "🌐 Your webhook URL: https://$DEPLOYMENT_URL/api/payments/chapa/webhook"

echo ""
echo "📝 Next steps:"
echo "1. Update your Chapa dashboard with the webhook URL above"
echo "2. Set environment variables in Vercel dashboard:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY" 
echo "   - CHAPA_WEBHOOK_SECRET"
echo "3. Test the webhook with a sample payment"

echo ""
echo "🔍 To monitor logs:"
echo "vercel logs"
