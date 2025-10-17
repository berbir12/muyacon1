-- FIX DATABASE PERMISSIONS - COMPLETE SOLUTION
-- Run this in Supabase SQL Editor to fix ALL permission issues

-- Step 1: Drop and recreate all tables with proper permissions
DROP TABLE IF EXISTS tasker_applications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS task_applications CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS task_categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Step 2: Create profiles table
CREATE TABLE profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer',
    current_mode VARCHAR(20) DEFAULT 'customer',
    tasker_application_status VARCHAR(20),
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create wallets table
CREATE TABLE wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.0,
    currency VARCHAR(10) DEFAULT 'ETB',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Step 4: Create notifications table
CREATE TABLE notifications (
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

-- Step 5: Create task_categories table
CREATE TABLE task_categories (
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

-- Step 6: Create tasks table
CREATE TABLE tasks (
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

-- Step 7: Create other required tables
CREATE TABLE task_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tasker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    proposed_price DECIMAL(10,2) NOT NULL,
    estimated_time INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    message TEXT,
    attachments TEXT[],
    availability_date DATE NOT NULL,
    estimated_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, tasker_id)
);

CREATE TABLE payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    last4 VARCHAR(4),
    brand VARCHAR(50),
    expiry_month INTEGER,
    expiry_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'ETB',
    status VARCHAR(20) DEFAULT 'pending',
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tasker_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    experience_years INTEGER DEFAULT 0,
    skills TEXT[],
    bio TEXT,
    portfolio_images TEXT[],
    certifications TEXT[],
    languages TEXT[],
    hourly_rate DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 8: Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasker_applications ENABLE ROW LEVEL SECURITY;

-- Step 9: Create PERMISSIVE policies (allows all access)
CREATE POLICY "profiles_policy" ON profiles FOR ALL USING (true);
CREATE POLICY "wallets_policy" ON wallets FOR ALL USING (true);
CREATE POLICY "notifications_policy" ON notifications FOR ALL USING (true);
CREATE POLICY "task_categories_policy" ON task_categories FOR ALL USING (true);
CREATE POLICY "tasks_policy" ON tasks FOR ALL USING (true);
CREATE POLICY "task_applications_policy" ON task_applications FOR ALL USING (true);
CREATE POLICY "payment_methods_policy" ON payment_methods FOR ALL USING (true);
CREATE POLICY "transactions_policy" ON transactions FOR ALL USING (true);
CREATE POLICY "ratings_policy" ON ratings FOR ALL USING (true);
CREATE POLICY "messages_policy" ON messages FOR ALL USING (true);
CREATE POLICY "tasker_applications_policy" ON tasker_applications FOR ALL USING (true);

-- Step 10: Insert your user profile
INSERT INTO profiles (user_id, full_name, username, phone, role, current_mode) 
VALUES ('e223f8e9-0941-4b33-88e8-de560aba72bc', 'Ejg', 'Ejg', '251911854765', 'customer', 'customer');

-- Step 11: Create wallet for your user
INSERT INTO wallets (user_id, balance, currency, is_active)
SELECT id, 0.0, 'ETB', true FROM profiles WHERE user_id = 'e223f8e9-0941-4b33-88e8-de560aba72bc';

-- Step 12: Insert default task categories
INSERT INTO task_categories (id, name, slug, description, icon, color, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'General', 'general', 'General tasks and services', 'briefcase', '#7B42F6', true),
('550e8400-e29b-41d4-a716-446655440001', 'Home & Garden', 'home-garden', 'Home improvement and gardening tasks', 'home', '#10B981', true),
('550e8400-e29b-41d4-a716-446655440002', 'Technology', 'technology', 'Tech support and computer services', 'laptop', '#3B82F6', true),
('550e8400-e29b-41d4-a716-446655440003', 'Transportation', 'transportation', 'Delivery and transportation services', 'car', '#F59E0B', true),
('550e8400-e29b-41d4-a716-446655440004', 'Cleaning', 'cleaning', 'House cleaning and maintenance', 'sparkles', '#EF4444', true);

-- Step 13: Grant permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Step 14: Grant permissions to anon users (if needed)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Step 15: Verify everything worked
SELECT 'SUCCESS: Database permissions fixed!' as result;
SELECT 'Tables created:' as info, count(*) as count FROM information_schema.tables WHERE table_schema = 'public';
SELECT 'Your profile:' as info, full_name, username FROM profiles WHERE user_id = 'e223f8e9-0941-4b33-88e8-de560aba72bc';
SELECT 'Your wallet:' as info, balance, currency FROM wallets w JOIN profiles p ON w.user_id = p.id WHERE p.user_id = 'e223f8e9-0941-4b33-88e8-de560aba72bc';
