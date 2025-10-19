export default function handler(req, res) {
  res.status(200).json({ 
    success: true, 
    message: 'Webhook server is running!',
    timestamp: new Date().toISOString(),
    environment: {
      supabase_url: process.env.SUPABASE_URL ? 'Set' : 'Not set',
      supabase_anon_key: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set',
      chapa_webhook_secret: process.env.CHAPA_WEBHOOK_SECRET ? 'Set' : 'Not set'
    }
  });
}
