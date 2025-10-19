// Test script for webhook endpoint
const https = require('https');

// Test webhook payload
const testPayload = {
  event: 'charge.completed',
  data: {
    tx_ref: 'test_' + Date.now(),
    amount: 1000,
    currency: 'ETB',
    status: 'success',
    created_at: new Date().toISOString(),
    customer: {
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone_number: '+251911234567'
    },
    meta: {
      task_id: 'task_test_123',
      tasker_id: 'tasker_test_123',
      platform_fee: 50,
      vat_amount: 150,
      net_amount: 800
    }
  }
};

// Webhook URL (replace with your actual URL after deployment)
const webhookUrl = process.argv[2] || 'http://localhost:3000/api/payments/chapa/webhook';

console.log('🧪 Testing webhook endpoint...');
console.log('📍 URL:', webhookUrl);
console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));

// Send test request
const postData = JSON.stringify(testPayload);

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'Chapa-Webhook-Test/1.0'
  }
};

const url = new URL(webhookUrl);
const requestOptions = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: options.headers
};

const req = (url.protocol === 'https:' ? https : require('http')).request(requestOptions, (res) => {
  console.log(`\n📊 Response Status: ${res.statusCode}`);
  console.log('📋 Response Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 Response Body:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed!');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.write(postData);
req.end();

console.log('\n⏳ Sending test request...');
