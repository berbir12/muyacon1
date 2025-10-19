# Chapa Payment Gateway Integration

This document provides a comprehensive guide for the Chapa payment gateway integration in the Muyacon platform.

## Overview

The payment system integrates with Chapa, Ethiopia's leading payment gateway, to process payments for tasks. The system includes:

- **VAT Calculation**: 15% VAT as per Ethiopian tax law
- **Platform Fee**: 5% fee deducted from tasker earnings
- **Wallet System**: Taskers receive payments in their digital wallet
- **Multiple Withdrawal Methods**: Bank transfer, mobile money, cash pickup

## Architecture

### Services

1. **ChapaPaymentService** (`services/ChapaPaymentService.ts`)
   - Handles Chapa API integration
   - Manages payment initialization and verification
   - Processes webhook notifications
   - Calculates VAT and platform fees

2. **WalletService** (`services/WalletService.ts`)
   - Manages tasker wallets
   - Handles withdrawal requests
   - Tracks transaction history
   - Provides wallet statistics

3. **PaymentService** (`services/PaymentService.ts`)
   - Updated to integrate with Chapa
   - Provides unified payment interface
   - Handles payment status tracking

### Components

1. **ChapaPaymentModal** (`components/ChapaPaymentModal.tsx`)
   - Payment initiation interface
   - Shows payment breakdown with VAT and fees
   - Handles payment status polling

2. **WalletComponent** (`components/WalletComponent.tsx`)
   - Displays wallet balance and statistics
   - Shows recent transactions
   - Provides withdrawal interface

3. **WithdrawalModal** (`components/WithdrawalModal.tsx`)
   - Withdrawal request form
   - Multiple withdrawal methods
   - Account details collection

4. **PaymentSuccessScreen** (`app/payment-success.tsx`)
   - Payment confirmation page
   - Shows payment details and breakdown
   - Handles payment verification

## Setup Instructions

### 1. Chapa Account Setup

1. Register at [Chapa Dashboard](https://dashboard.chapa.co/register)
2. Complete business verification
3. Get API credentials from Account > Settings > API
4. Set up webhook URL in Account > Settings > Webhooks

### 2. Environment Configuration

Create a `.env` file in the frontend directory:

```env
# Chapa Payment Gateway Configuration
EXPO_PUBLIC_CHAPA_PUBLIC_KEY=your_chapa_public_key_here
EXPO_PUBLIC_CHAPA_SECRET_KEY=your_chapa_secret_key_here
EXPO_PUBLIC_CHAPA_WEBHOOK_SECRET=your_chapa_webhook_secret_here

# API Configuration
EXPO_PUBLIC_API_URL=https://your-api-domain.com
EXPO_PUBLIC_APP_URL=https://your-app-domain.com
```

### 3. Database Schema

The payment system uses the existing database schema with these key tables:

- `transactions`: Payment records
- `wallets`: Tasker wallet balances
- `tasks`: Task information and payment status

### 4. Webhook Setup

Set up a webhook endpoint to handle Chapa notifications:

```typescript
// Example webhook handler
app.post('/api/payments/chapa/webhook', async (req, res) => {
  try {
    const payload = req.body
    const success = await ChapaPaymentService.handleWebhook(payload)
    
    if (success) {
      res.status(200).json({ success: true })
    } else {
      res.status(400).json({ success: false })
    }
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ success: false })
  }
})
```

## Payment Flow

### 1. Task Payment Initiation

```typescript
// Initialize payment for a task
const result = await PaymentService.initializeChapaPayment(
  taskId,
  customerUserId,
  {
    email: 'customer@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+251911234567'
  }
)

if (result) {
  // Open Chapa checkout
  await Linking.openURL(result.checkoutUrl)
}
```

### 2. Payment Processing

1. Customer completes payment on Chapa checkout
2. Chapa sends webhook notification
3. System verifies payment with Chapa API
4. Payment status updated in database
5. Tasker wallet credited (minus platform fee)

### 3. Wallet Management

```typescript
// Get wallet details
const walletDetails = await WalletService.getWalletDetails(taskerUserId)

// Request withdrawal
const success = await WalletService.requestWithdrawal(
  taskerUserId,
  amount,
  'bank_transfer',
  {
    accountNumber: '1234567890',
    bankName: 'Commercial Bank of Ethiopia'
  }
)
```

## Payment Calculation

### Example Calculation

For a task with budget of 1000 ETB:

```
Subtotal:           1,000.00 ETB
VAT (15%):            150.00 ETB
Total Amount:       1,150.00 ETB
Platform Fee (5%):     57.50 ETB
Tasker Receives:    1,092.50 ETB
```

### Code Implementation

```typescript
const breakdown = ChapaPaymentService.calculatePaymentBreakdown(1000)
console.log(breakdown)
// {
//   originalAmount: 1000,
//   vatAmount: 150,
//   totalAmount: 1150,
//   platformFee: 57.5,
//   netAmount: 1092.5,
//   breakdown: { ... }
// }
```

## Withdrawal Methods

### 1. Bank Transfer
- **Min Amount**: 100 ETB
- **Max Amount**: 50,000 ETB
- **Processing Time**: 1-3 business days
- **Fee**: Free

### 2. Mobile Money
- **Min Amount**: 10 ETB
- **Max Amount**: 10,000 ETB
- **Processing Time**: Instant
- **Fee**: 5 ETB

### 3. Cash Pickup
- **Min Amount**: 50 ETB
- **Max Amount**: 20,000 ETB
- **Processing Time**: Same day
- **Fee**: Free

## Security Considerations

1. **API Key Protection**: Store API keys securely in environment variables
2. **Webhook Verification**: Verify webhook signatures
3. **HTTPS**: Use HTTPS for all payment-related endpoints
4. **Data Encryption**: Encrypt sensitive payment data
5. **PCI Compliance**: Follow PCI DSS guidelines

## Error Handling

The system includes comprehensive error handling:

```typescript
try {
  const result = await ChapaPaymentService.initializePayment(...)
} catch (error) {
  const appError = handleError(error, 'initializePayment')
  console.error('Payment error:', appError)
  // Handle error appropriately
}
```

## Testing

### Test Mode

Chapa provides test credentials for development:

```typescript
// Use test credentials for development
const CHAPA_CONFIG = {
  publicKey: 'CHAPUBK_TEST-xxxxxxxxxxxxxxxxxxxxxxxx',
  secretKey: 'CHASECK_TEST-xxxxxxxxxxxxxxxxxxxxxxxx',
  // ... other config
}
```

### Test Cards

Use Chapa's test card numbers for testing:
- **Success**: 4000000000000002
- **Declined**: 4000000000000069
- **Insufficient Funds**: 4000000000000119

## Monitoring and Analytics

Track payment metrics:

```typescript
// Get payment statistics
const stats = await PaymentService.getPaymentStats(userId)
console.log(stats)
// {
//   totalPayments: 10,
//   totalAmount: 15000,
//   pendingPayments: 2,
//   completedPayments: 8,
//   failedPayments: 0
// }
```

## Troubleshooting

### Common Issues

1. **Payment Initialization Fails**
   - Check API credentials
   - Verify webhook URL is accessible
   - Ensure sufficient balance

2. **Webhook Not Received**
   - Check webhook URL configuration
   - Verify server is accessible
   - Check webhook secret

3. **Payment Verification Fails**
   - Check transaction reference
   - Verify payment status with Chapa
   - Check database connection

### Debug Mode

Enable debug logging:

```typescript
// Add to your app configuration
const DEBUG_PAYMENTS = true

if (DEBUG_PAYMENTS) {
  console.log('Payment debug info:', paymentData)
}
```

## Support

For technical support:

1. **Chapa Documentation**: [developer.chapa.co](https://developer.chapa.co)
2. **Chapa Support**: support@chapa.co
3. **Internal Support**: Contact your development team

## Changelog

### Version 1.0.0
- Initial Chapa integration
- VAT calculation (15%)
- Platform fee (5%)
- Wallet system
- Multiple withdrawal methods
- Payment status tracking
- Comprehensive error handling

## License

This payment integration is part of the Muyacon platform and follows the same licensing terms.
