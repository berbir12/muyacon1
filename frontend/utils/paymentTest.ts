// Payment calculation test utilities
import { ChapaPaymentService } from '../services/ChapaPaymentService'

export function testPaymentCalculations() {
  console.log('🧪 Testing Payment Calculations...\n')

  // Test cases
  const testCases = [
    { amount: 100, description: 'Small task' },
    { amount: 1000, description: 'Medium task' },
    { amount: 5000, description: 'Large task' },
    { amount: 10000, description: 'Premium task' },
  ]

  testCases.forEach(({ amount, description }) => {
    console.log(`📊 ${description} (${amount} ETB):`)
    
    const breakdown = ChapaPaymentService.calculatePaymentBreakdown(amount)
    
    console.log(`   Subtotal:     ${breakdown.breakdown.subtotal.toFixed(2)} ETB`)
    console.log(`   VAT (15%):    ${breakdown.breakdown.vat.toFixed(2)} ETB`)
    console.log(`   Total:        ${breakdown.breakdown.total.toFixed(2)} ETB`)
    console.log(`   Platform Fee: ${breakdown.breakdown.platformFee.toFixed(2)} ETB`)
    console.log(`   Tasker Gets:  ${breakdown.breakdown.netToTasker.toFixed(2)} ETB`)
    console.log(`   Platform %:   ${((breakdown.breakdown.platformFee / breakdown.breakdown.total) * 100).toFixed(2)}%`)
    console.log('')
  })

  // Test edge cases
  console.log('🔍 Testing Edge Cases:')
  
  // Very small amount
  const smallAmount = ChapaPaymentService.calculatePaymentBreakdown(10)
  console.log(`   Minimum amount (10 ETB): Tasker gets ${smallAmount.breakdown.netToTasker.toFixed(2)} ETB`)
  
  // Large amount
  const largeAmount = ChapaPaymentService.calculatePaymentBreakdown(50000)
  console.log(`   Large amount (50,000 ETB): Tasker gets ${largeAmount.breakdown.netToTasker.toFixed(2)} ETB`)
  
  // Round number
  const roundAmount = ChapaPaymentService.calculatePaymentBreakdown(1000)
  console.log(`   Round amount (1,000 ETB): Tasker gets ${roundAmount.breakdown.netToTasker.toFixed(2)} ETB`)

  console.log('\n✅ Payment calculation tests completed!')
}

// VAT compliance test
export function testVATCompliance() {
  console.log('🏛️ Testing VAT Compliance...\n')

  const testAmount = 1000
  const breakdown = ChapaPaymentService.calculatePaymentBreakdown(testAmount)
  
  const expectedVAT = testAmount * 0.15
  const actualVAT = breakdown.breakdown.vat
  
  console.log(`   Test Amount: ${testAmount} ETB`)
  console.log(`   Expected VAT (15%): ${expectedVAT.toFixed(2)} ETB`)
  console.log(`   Actual VAT: ${actualVAT.toFixed(2)} ETB`)
  console.log(`   VAT Correct: ${Math.abs(expectedVAT - actualVAT) < 0.01 ? '✅' : '❌'}`)
  
  const vatRate = (actualVAT / testAmount) * 100
  console.log(`   VAT Rate: ${vatRate.toFixed(2)}%`)
  console.log(`   Compliant: ${Math.abs(vatRate - 15) < 0.01 ? '✅' : '❌'}`)
  
  console.log('\n✅ VAT compliance test completed!')
}

// Platform fee test
export function testPlatformFee() {
  console.log('💰 Testing Platform Fee...\n')

  const testAmount = 1000
  const breakdown = ChapaPaymentService.calculatePaymentBreakdown(testAmount)
  
  const totalAmount = breakdown.breakdown.total
  const expectedFee = totalAmount * 0.05
  const actualFee = breakdown.breakdown.platformFee
  
  console.log(`   Total Amount: ${totalAmount.toFixed(2)} ETB`)
  console.log(`   Expected Fee (5%): ${expectedFee.toFixed(2)} ETB`)
  console.log(`   Actual Fee: ${actualFee.toFixed(2)} ETB`)
  console.log(`   Fee Correct: ${Math.abs(expectedFee - actualFee) < 0.01 ? '✅' : '❌'}`)
  
  const feeRate = (actualFee / totalAmount) * 100
  console.log(`   Fee Rate: ${feeRate.toFixed(2)}%`)
  console.log(`   Compliant: ${Math.abs(feeRate - 5) < 0.01 ? '✅' : '❌'}`)
  
  console.log('\n✅ Platform fee test completed!')
}

// Run all tests
export function runAllPaymentTests() {
  console.log('🚀 Running All Payment Tests\n')
  console.log('=' .repeat(50))
  
  testPaymentCalculations()
  console.log('=' .repeat(50))
  
  testVATCompliance()
  console.log('=' .repeat(50))
  
  testPlatformFee()
  console.log('=' .repeat(50))
  
  console.log('🎉 All tests completed successfully!')
}

// Example usage in development
if (__DEV__) {
  // Uncomment to run tests
  // runAllPaymentTests()
}
