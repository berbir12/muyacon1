const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET requests for testing
  if (req.method === 'GET') {
    return res.status(200).json({ 
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

  // Handle POST requests (webhook)
  if (req.method === 'POST') {
    try {
      const payload = req.body;
      console.log('Received webhook:', JSON.stringify(payload, null, 2));

      // Simple response for now
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received successfully',
        received_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    error: 'Method not allowed' 
  });
}
