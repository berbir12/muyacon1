// Test Chapa API authentication
const fetch = require('node-fetch');

const CHAPA_CONFIG = {
  publicKey: 'CHAPUBK_TEST-dtyRbkCvLfkYMpzXE6IbUMSPJC1XvJ1q',
  secretKey: 'CHASECK_TEST-zN7gCzpRPrCM83Xkbm9K1QbIhZAzF4HZ',
  baseUrl: 'https://api.chapa.co/v1'
};

async function testChapaAuth() {
  console.log('🔐 Testing Chapa API Authentication...\n');

  try {
    // Test with a simple request to check if the API key works
    const response = await fetch(`${CHAPA_CONFIG.baseUrl}/banks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CHAPA_CONFIG.secretKey}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📄 Response Body:', responseText);

    if (response.ok) {
      console.log('\n✅ Chapa API authentication successful!');
    } else {
      console.log('\n❌ Chapa API authentication failed!');
    }

  } catch (error) {
    console.error('\n❌ Error testing Chapa API:', error.message);
  }
}

testChapaAuth();
