// Test Chapa API directly
const fetch = require('node-fetch');

const CHAPA_CONFIG = {
  publicKey: 'CHAPUBK_TEST-dtyRbkCvLfkYMpzXE6IbUMSPJC1XvJ1q',
  secretKey: 'CHASECK_TEST-zN7gCzpRPrCM83Xkbm9K1QbIhZAzF4HZ',
  baseUrl: 'https://api.chapa.co/v1'
};

async function testChapaAPI() {
  console.log('🧪 Testing Chapa API...\n');

  const paymentRequest = {
    amount: '100',
    currency: 'ETB',
    email: 'test@gmail.com',
    first_name: 'Test',
    last_name: 'User',
    phone_number: '+251911234567',
    tx_ref: 'test_' + Date.now(),
    callback_url: 'https://mchapaw-n0utcbuab-bereket-birhanu-kinfus-projects.vercel.app/api/webhook',
    return_url: 'https://muyacon.com/payment-success',
    customization: {
      title: 'Muyacon',
      description: 'Test Payment'
    }
  };

  try {
    console.log('📤 Sending request to:', `${CHAPA_CONFIG.baseUrl}/transaction/initialize`);
    console.log('🔑 Using secret key:', CHAPA_CONFIG.secretKey.substring(0, 20) + '...');
    console.log('📦 Request body:', JSON.stringify(paymentRequest, null, 2));

    // Try different endpoint
    const response = await fetch(`${CHAPA_CONFIG.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHAPA_CONFIG.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentRequest)
    });

    console.log('\n📊 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📄 Response Body:', responseText);

    if (response.ok) {
      console.log('\n✅ Chapa API test successful!');
    } else {
      console.log('\n❌ Chapa API test failed!');
    }

  } catch (error) {
    console.error('\n❌ Error testing Chapa API:', error.message);
  }
}

testChapaAPI();
