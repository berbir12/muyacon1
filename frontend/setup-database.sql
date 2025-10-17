-- Simple Database Setup
-- Run this in Supabase SQL Editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer',
    current_mode VARCHAR(20) DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.0,
    currency VARCHAR(10) DEFAULT 'ETB',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'system',
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_categories table
CREATE TABLE IF NOT EXISTS task_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL(10,2) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    task_date DATE,
    task_time TIME,
    flexible_date BOOLEAN DEFAULT false,
    estimated_hours INTEGER,
    task_size VARCHAR(20) DEFAULT 'medium',
    urgency VARCHAR(20) DEFAULT 'flexible',
    status VARCHAR(20) DEFAULT 'open',
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tasker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
    category VARCHAR(100),
    images TEXT[],
    requirements TEXT[],
    attachments TEXT[],
    tags TEXT[],
    is_featured BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_review TEXT,
    tasker_rating INTEGER CHECK (tasker_rating >= 1 AND tasker_rating <= 5),
    tasker_review TEXT,
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    final_price DECIMAL(10,2),
    special_instructions TEXT,
    photos TEXT[],
    estimated_duration_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "profiles_policy" ON profiles FOR ALL USING (true);
CREATE POLICY "wallets_policy" ON wallets FOR ALL USING (true);
CREATE POLICY "notifications_policy" ON notifications FOR ALL USING (true);
CREATE POLICY "task_categories_policy" ON task_categories FOR ALL USING (true);
CREATE POLICY "tasks_policy" ON tasks FOR ALL USING (true);

-- Insert your user profile
INSERT INTO profiles (user_id, full_name, username, phone, role, current_mode) 
VALUES ('e223f8e9-0941-4b33-88e8-de560aba72bc', 'Ejg', 'Ejg', '251911854765', 'customer', 'customer')
ON CONFLICT (user_id) DO NOTHING;

-- Create wallet for your user
INSERT INTO wallets (user_id, balance, currency, is_active)
SELECT id, 0.0, 'ETB', true FROM profiles WHERE user_id = 'e223f8e9-0941-4b33-88e8-de560aba72bc'
ON CONFLICT (user_id) DO NOTHING;

-- Insert default task categories
INSERT INTO task_categories (id, name, slug, description, icon, color, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'General', 'general', 'General tasks and services', 'briefcase', '#7B42F6', true),
('550e8400-e29b-41d4-a716-446655440001', 'Home & Garden', 'home-garden', 'Home improvement and gardening tasks', 'home', '#10B981', true),
('550e8400-e29b-41d4-a716-446655440002', 'Technology', 'technology', 'Tech support and computer services', 'laptop', '#3B82F6', true),
('550e8400-e29b-41d4-a716-446655440003', 'Transportation', 'transportation', 'Delivery and transportation services', 'car', '#F59E0B', true),
('550e8400-e29b-41d4-a716-446655440004', 'Cleaning', 'cleaning', 'House cleaning and maintenance', 'sparkles', '#EF4444', true)
ON CONFLICT (name) DO NOTHING;

-- Done!
SELECT 'SUCCESS: Database setup complete!' as result;
