-- Payment System Database Schema
-- This script creates all necessary tables for the payment and wallet system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, currency)
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('card', 'bank_account', 'wallet')),
    last4 VARCHAR(4),
    brand VARCHAR(50),
    expiry_month INTEGER CHECK (expiry_month >= 1 AND expiry_month <= 12),
    expiry_year INTEGER CHECK (expiry_year >= 2024),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('payment', 'refund', 'withdrawal', 'deposit', 'commission')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment intents table (for Stripe integration)
CREATE TABLE IF NOT EXISTS payment_intents (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'requires_payment_method',
    client_secret VARCHAR(255) NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    bank_account_id VARCHAR(255),
    bank_account_details JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission rates table
CREATE TABLE IF NOT EXISTS commission_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_category_id UUID REFERENCES task_categories(id) ON DELETE CASCADE,
    rate DECIMAL(5,4) NOT NULL DEFAULT 0.1000, -- 10% default commission
    min_amount DECIMAL(10,2) DEFAULT 0.00,
    max_amount DECIMAL(10,2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add payment status to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_task_id ON transactions(task_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON payment_intents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON withdrawal_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;

-- Wallets policies
CREATE POLICY "Users can view their own wallets" ON wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets" ON wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" ON wallets
    FOR UPDATE USING (auth.uid() = user_id);

-- Payment methods policies
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" ON payment_methods
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" ON payment_methods
    FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

-- Payment intents policies
CREATE POLICY "Users can view their own payment intents" ON payment_intents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment intents" ON payment_intents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment intents" ON payment_intents
    FOR UPDATE USING (auth.uid() = user_id);

-- Withdrawal requests policies
CREATE POLICY "Users can view their own withdrawal requests" ON withdrawal_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawal requests" ON withdrawal_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own withdrawal requests" ON withdrawal_requests
    FOR UPDATE USING (auth.uid() = user_id);

-- Commission rates policies (admin only)
CREATE POLICY "Anyone can view commission rates" ON commission_rates
    FOR SELECT USING (true);

-- Insert default commission rates
INSERT INTO commission_rates (task_category_id, rate, min_amount, max_amount, is_active)
SELECT 
    id,
    0.1000, -- 10% commission
    0.00,
    NULL,
    true
FROM task_categories
WHERE NOT EXISTS (SELECT 1 FROM commission_rates WHERE task_category_id = task_categories.id);

-- Create function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new payment method is being set as default
    IF NEW.is_default = true THEN
        -- Unset all other default payment methods for this user
        UPDATE payment_methods 
        SET is_default = false 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to ensure single default payment method
CREATE TRIGGER ensure_single_default_payment_method_trigger
    BEFORE INSERT OR UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_payment_method();

-- Create function to validate wallet balance before withdrawal
CREATE OR REPLACE FUNCTION validate_withdrawal_amount()
RETURNS TRIGGER AS $$
DECLARE
    current_balance DECIMAL(10,2);
BEGIN
    -- Get current wallet balance
    SELECT balance INTO current_balance
    FROM wallets
    WHERE user_id = NEW.user_id AND is_active = true;
    
    -- Check if balance is sufficient
    IF current_balance < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient funds for withdrawal';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to validate withdrawal amount
CREATE TRIGGER validate_withdrawal_amount_trigger
    BEFORE INSERT ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION validate_withdrawal_amount();

-- Create function to update wallet balance after transaction
CREATE OR REPLACE FUNCTION update_wallet_balance_after_transaction()
RETURNS TRIGGER AS $$
DECLARE
    wallet_record RECORD;
BEGIN
    -- Get wallet for user
    SELECT * INTO wallet_record
    FROM wallets
    WHERE user_id = NEW.user_id AND is_active = true;
    
    -- If wallet doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO wallets (user_id, balance, currency, is_active)
        VALUES (NEW.user_id, 0.00, NEW.currency, true);
        
        SELECT * INTO wallet_record
        FROM wallets
        WHERE user_id = NEW.user_id AND is_active = true;
    END IF;
    
    -- Update wallet balance based on transaction type
    IF NEW.type = 'deposit' OR NEW.type = 'refund' THEN
        UPDATE wallets
        SET balance = balance + NEW.amount,
            updated_at = NOW()
        WHERE user_id = NEW.user_id AND is_active = true;
    ELSIF NEW.type = 'withdrawal' OR NEW.type = 'payment' THEN
        UPDATE wallets
        SET balance = balance - NEW.amount,
            updated_at = NOW()
        WHERE user_id = NEW.user_id AND is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update wallet balance after transaction
CREATE TRIGGER update_wallet_balance_after_transaction_trigger
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_balance_after_transaction();

-- Create view for wallet summary
CREATE OR REPLACE VIEW wallet_summary AS
SELECT 
    w.id,
    w.user_id,
    w.balance,
    w.currency,
    w.is_active,
    w.created_at,
    w.updated_at,
    COUNT(t.id) as total_transactions,
    COALESCE(SUM(CASE WHEN t.type = 'deposit' OR t.type = 'refund' THEN t.amount ELSE 0 END), 0) as total_deposits,
    COALESCE(SUM(CASE WHEN t.type = 'withdrawal' OR t.type = 'payment' THEN t.amount ELSE 0 END), 0) as total_withdrawals,
    COALESCE(SUM(CASE WHEN t.type = 'commission' THEN t.amount ELSE 0 END), 0) as total_commissions
FROM wallets w
LEFT JOIN transactions t ON w.user_id = t.user_id
WHERE w.is_active = true
GROUP BY w.id, w.user_id, w.balance, w.currency, w.is_active, w.created_at, w.updated_at;

-- Grant necessary permissions
GRANT SELECT ON wallet_summary TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
