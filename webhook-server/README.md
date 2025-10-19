# Muyacon Webhook Server

This is a webhook server for handling Chapa payment notifications in the Muyacon platform.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd webhook-server
npm install
```

### 2. Set Environment Variables
Create a `.env.local` file:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
CHAPA_WEBHOOK_SECRET=qwertyuil@1A
```

### 3. Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add CHAPA_WEBHOOK_SECRET
```

#### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set environment variables in the dashboard
4. Deploy

### 4. Update Chapa Dashboard
Once deployed, update your Chapa webhook URL:
- **Webhook URL**: `https://your-app.vercel.app/api/payments/chapa/webhook`
- **Secret Hash**: `qwertyuil@1A`

## 🔧 How It Works

1. **Chapa sends webhook** → Your Vercel function receives it
2. **Verify signature** → Ensures the webhook is from Chapa
3. **Process payment** → Updates Supabase database
4. **Credit tasker wallet** → Adds money to tasker's account
5. **Update task status** → Marks task as paid

## 📊 Webhook Events Handled

- `charge.completed` - Payment successful
- `charge.success` - Payment successful (alternative)

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run locally
vercel dev

# Test webhook
curl -X POST http://localhost:3000/api/payments/chapa/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"charge.completed","data":{"tx_ref":"test123","amount":1000}}'
```

## 🔍 Monitoring

Check Vercel function logs:
1. Go to Vercel dashboard
2. Select your project
3. Go to "Functions" tab
4. Click on the webhook function
5. View logs in real-time

## 🚨 Troubleshooting

### Common Issues

1. **Webhook not received**
   - Check Vercel deployment status
   - Verify webhook URL in Chapa dashboard
   - Check function logs

2. **Database errors**
   - Verify Supabase credentials
   - Check database permissions
   - Ensure tables exist

3. **Signature verification fails**
   - Check webhook secret matches
   - Verify payload format

### Testing

Use Chapa's test webhook payload:
```json
{
  "event": "charge.completed",
  "data": {
    "tx_ref": "test_123",
    "amount": 1000,
    "currency": "ETB",
    "status": "success",
    "meta": {
      "task_id": "task_123",
      "tasker_id": "tasker_123",
      "platform_fee": 50,
      "vat_amount": 150,
      "net_amount": 800
    }
  }
}
```

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `CHAPA_WEBHOOK_SECRET` | Chapa webhook secret | `qwertyuil@1A` |

## 🔒 Security

- Webhook signature verification
- CORS headers configured
- Error handling and logging
- Environment variable protection

## 📞 Support

For issues with this webhook server:
1. Check Vercel function logs
2. Verify Chapa webhook configuration
3. Test with sample payload
4. Contact development team
