-- Complete RLS Policy Fix for Muyacon App
-- This script fixes all RLS policy conflicts and ensures proper data access

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'tasks', 'task_applications', 'task_categories', 'task_status_updates', 'chats', 'messages', 'notifications', 'ratings', 'reviews', 'direct_bookings', 'categories')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- PROFILES TABLE POLICIES
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- TASKS TABLE POLICIES
CREATE POLICY "Users can view all tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Taskers can update assigned tasks" ON public.tasks FOR UPDATE USING (auth.uid() = tasker_id);

-- TASK_APPLICATIONS TABLE POLICIES
CREATE POLICY "Users can view all task applications" ON public.task_applications FOR SELECT USING (true);
CREATE POLICY "Users can insert own applications" ON public.task_applications FOR INSERT WITH CHECK (auth.uid() = tasker_id);
CREATE POLICY "Users can update own applications" ON public.task_applications FOR UPDATE USING (auth.uid() = tasker_id);
CREATE POLICY "Task owners can update applications for their tasks" ON public.task_applications FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.tasks 
        WHERE tasks.id = task_applications.task_id 
        AND tasks.customer_id = auth.uid()
    )
);

-- TASK_CATEGORIES TABLE POLICIES
CREATE POLICY "Users can view all task categories" ON public.task_categories FOR SELECT USING (true);
CREATE POLICY "Users can insert task categories" ON public.task_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update task categories" ON public.task_categories FOR UPDATE USING (true);

-- TASK_STATUS_UPDATES TABLE POLICIES
CREATE POLICY "Users can view all task status updates" ON public.task_status_updates FOR SELECT USING (true);
CREATE POLICY "Users can insert task status updates" ON public.task_status_updates FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update task status updates" ON public.task_status_updates FOR UPDATE USING (true);

-- CHATS TABLE POLICIES
CREATE POLICY "Users can view their chats" ON public.chats FOR SELECT USING (
    auth.uid() = customer_id OR auth.uid() = tasker_id
);
CREATE POLICY "Users can insert chats" ON public.chats FOR INSERT WITH CHECK (
    auth.uid() = customer_id OR auth.uid() = tasker_id
);
CREATE POLICY "Users can update their chats" ON public.chats FOR UPDATE USING (
    auth.uid() = customer_id OR auth.uid() = tasker_id
);

-- MESSAGES TABLE POLICIES
CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = messages.chat_id 
        AND (chats.customer_id = auth.uid() OR chats.tasker_id = auth.uid())
    )
);
CREATE POLICY "Users can insert messages in their chats" ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE chats.id = messages.chat_id 
            AND (chats.customer_id = auth.uid() OR chats.tasker_id = auth.uid())
        )
    )
);
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id);

-- NOTIFICATIONS TABLE POLICIES
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- RATINGS TABLE POLICIES
CREATE POLICY "Users can view all ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own ratings" ON public.ratings FOR INSERT WITH CHECK (
    auth.uid() = customer_id OR auth.uid() = tasker_id
);
CREATE POLICY "Users can update own ratings" ON public.ratings FOR UPDATE USING (
    auth.uid() = customer_id OR auth.uid() = tasker_id
);

-- REVIEWS TABLE POLICIES
CREATE POLICY "Users can view all reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- DIRECT_BOOKINGS TABLE POLICIES
CREATE POLICY "Users can view their bookings" ON public.direct_bookings FOR SELECT USING (
    auth.uid() = customer_id OR auth.uid() = technician_id
);
CREATE POLICY "Users can insert bookings" ON public.direct_bookings FOR INSERT WITH CHECK (
    auth.uid() = customer_id OR auth.uid() = technician_id
);
CREATE POLICY "Users can update their bookings" ON public.direct_bookings FOR UPDATE USING (
    auth.uid() = customer_id OR auth.uid() = technician_id
);

-- CATEGORIES TABLE POLICIES
CREATE POLICY "Users can view all categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Users can insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update categories" ON public.categories FOR UPDATE USING (true);

-- Grant necessary permissions
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.tasks TO anon, authenticated;
GRANT ALL ON public.task_applications TO anon, authenticated;
GRANT ALL ON public.task_categories TO anon, authenticated;
GRANT ALL ON public.task_status_updates TO anon, authenticated;
GRANT ALL ON public.chats TO anon, authenticated;
GRANT ALL ON public.messages TO anon, authenticated;
GRANT ALL ON public.notifications TO anon, authenticated;
GRANT ALL ON public.ratings TO anon, authenticated;
GRANT ALL ON public.reviews TO anon, authenticated;
GRANT ALL ON public.direct_bookings TO anon, authenticated;
GRANT ALL ON public.categories TO anon, authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON public.tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tasker_id ON public.tasks(tasker_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON public.tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_task_applications_task_id ON public.task_applications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_applications_tasker_id ON public.task_applications(tasker_id);
CREATE INDEX IF NOT EXISTS idx_task_applications_status ON public.task_applications(status);
CREATE INDEX IF NOT EXISTS idx_chats_customer_id ON public.chats(customer_id);
CREATE INDEX IF NOT EXISTS idx_chats_tasker_id ON public.chats(tasker_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Verify RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
FROM pg_tables t 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'tasks', 'task_applications', 'task_categories', 'task_status_updates', 'chats', 'messages', 'notifications', 'ratings', 'reviews', 'direct_bookings', 'categories')
ORDER BY tablename;
