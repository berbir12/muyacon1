-- Rating and Review System Database Schema
-- This script creates all necessary tables for the rating and review system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    review_type VARCHAR(20) NOT NULL CHECK (review_type IN ('customer_to_tasker', 'tasker_to_customer')),
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, reviewer_id, reviewee_id, review_type)
);

-- User rating summaries table (for performance optimization)
CREATE TABLE IF NOT EXISTS user_rating_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    average_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    rating_breakdown JSONB NOT NULL DEFAULT '{"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Review reports table (for moderation)
CREATE TABLE IF NOT EXISTS review_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'fake', 'harassment', 'other')),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review likes table (for helpful reviews)
CREATE TABLE IF NOT EXISTS review_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_task_id ON reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_review_type ON reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_rating_summaries_user_id ON user_rating_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rating_summaries_average_rating ON user_rating_summaries(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_reporter_id ON review_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(status);
CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_rating_summaries_updated_at BEFORE UPDATE ON user_rating_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_review_reports_updated_at BEFORE UPDATE ON review_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rating_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (auth.uid() = reviewer_id);

-- User rating summaries policies
CREATE POLICY "Anyone can view rating summaries" ON user_rating_summaries
    FOR SELECT USING (true);

CREATE POLICY "System can manage rating summaries" ON user_rating_summaries
    FOR ALL USING (true);

-- Review reports policies
CREATE POLICY "Users can view their own reports" ON review_reports
    FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can insert reports" ON review_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage reports" ON review_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Review likes policies
CREATE POLICY "Anyone can view review likes" ON review_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" ON review_likes
    FOR ALL USING (auth.uid() = user_id);

-- Create function to update rating summary when review is created/updated/deleted
CREATE OR REPLACE FUNCTION update_user_rating_summary()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    rating_stats RECORD;
BEGIN
    -- Determine which user's rating summary to update
    IF TG_OP = 'DELETE' THEN
        target_user_id := OLD.reviewee_id;
    ELSE
        target_user_id := NEW.reviewee_id;
    END IF;

    -- Calculate rating statistics for the user
    SELECT 
        COALESCE(AVG(rating), 0) as avg_rating,
        COUNT(*) as total_reviews,
        jsonb_build_object(
            '5', COUNT(*) FILTER (WHERE rating = 5),
            '4', COUNT(*) FILTER (WHERE rating = 4),
            '3', COUNT(*) FILTER (WHERE rating = 3),
            '2', COUNT(*) FILTER (WHERE rating = 2),
            '1', COUNT(*) FILTER (WHERE rating = 1)
        ) as breakdown
    INTO rating_stats
    FROM reviews
    WHERE reviewee_id = target_user_id;

    -- Update or insert rating summary
    INSERT INTO user_rating_summaries (user_id, average_rating, total_reviews, rating_breakdown)
    VALUES (target_user_id, rating_stats.avg_rating, rating_stats.total_reviews, rating_stats.breakdown)
    ON CONFLICT (user_id)
    DO UPDATE SET
        average_rating = rating_stats.avg_rating,
        total_reviews = rating_stats.total_reviews,
        rating_breakdown = rating_stats.breakdown,
        updated_at = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers to update rating summaries
CREATE TRIGGER update_rating_summary_on_review_insert
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating_summary();

CREATE TRIGGER update_rating_summary_on_review_update
    AFTER UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating_summary();

CREATE TRIGGER update_rating_summary_on_review_delete
    AFTER DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating_summary();

-- Create function to validate review permissions
CREATE OR REPLACE FUNCTION validate_review_permissions()
RETURNS TRIGGER AS $$
DECLARE
    task_record RECORD;
BEGIN
    -- Get task details
    SELECT status, customer_id, assigned_tasker_id
    INTO task_record
    FROM tasks
    WHERE id = NEW.task_id;

    -- Check if task exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    -- Check if task is completed
    IF task_record.status != 'completed' THEN
        RAISE EXCEPTION 'Can only review completed tasks';
    END IF;

    -- Validate reviewer permissions based on review type
    IF NEW.review_type = 'customer_to_tasker' THEN
        -- Customer reviewing tasker
        IF task_record.customer_id != NEW.reviewer_id THEN
            RAISE EXCEPTION 'Only the customer can review the tasker';
        END IF;
        IF task_record.assigned_tasker_id != NEW.reviewee_id THEN
            RAISE EXCEPTION 'Can only review the assigned tasker';
        END IF;
    ELSIF NEW.review_type = 'tasker_to_customer' THEN
        -- Tasker reviewing customer
        IF task_record.assigned_tasker_id != NEW.reviewer_id THEN
            RAISE EXCEPTION 'Only the assigned tasker can review the customer';
        END IF;
        IF task_record.customer_id != NEW.reviewee_id THEN
            RAISE EXCEPTION 'Can only review the customer who posted the task';
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid review type';
    END IF;

    -- Check for duplicate reviews
    IF EXISTS (
        SELECT 1 FROM reviews
        WHERE task_id = NEW.task_id
        AND reviewer_id = NEW.reviewer_id
        AND reviewee_id = NEW.reviewee_id
        AND review_type = NEW.review_type
        AND id != COALESCE(NEW.id, uuid_generate_v4())
    ) THEN
        RAISE EXCEPTION 'Review already exists for this task and user combination';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to validate review permissions
CREATE TRIGGER validate_review_permissions_trigger
    BEFORE INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION validate_review_permissions();

-- Create function to prevent self-reviews
CREATE OR REPLACE FUNCTION prevent_self_review()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reviewer_id = NEW.reviewee_id THEN
        RAISE EXCEPTION 'Users cannot review themselves';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to prevent self-reviews
CREATE TRIGGER prevent_self_review_trigger
    BEFORE INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_review();

-- Create view for review statistics
CREATE OR REPLACE VIEW review_statistics AS
SELECT 
    r.reviewee_id,
    p.name as reviewee_name,
    p.current_mode as user_type,
    COUNT(r.id) as total_reviews,
    AVG(r.rating) as average_rating,
    COUNT(r.id) FILTER (WHERE r.rating = 5) as five_star_reviews,
    COUNT(r.id) FILTER (WHERE r.rating = 4) as four_star_reviews,
    COUNT(r.id) FILTER (WHERE r.rating = 3) as three_star_reviews,
    COUNT(r.id) FILTER (WHERE r.rating = 2) as two_star_reviews,
    COUNT(r.id) FILTER (WHERE r.rating = 1) as one_star_reviews,
    COUNT(r.id) FILTER (WHERE r.review_type = 'customer_to_tasker') as customer_reviews,
    COUNT(r.id) FILTER (WHERE r.review_type = 'tasker_to_customer') as tasker_reviews,
    MAX(r.created_at) as last_review_date
FROM reviews r
JOIN profiles p ON r.reviewee_id = p.id
GROUP BY r.reviewee_id, p.name, p.current_mode;

-- Create view for top-rated users
CREATE OR REPLACE VIEW top_rated_users AS
SELECT 
    urs.user_id,
    p.name,
    p.current_mode,
    p.avatar_url,
    urs.average_rating,
    urs.total_reviews,
    urs.rating_breakdown
FROM user_rating_summaries urs
JOIN profiles p ON urs.user_id = p.id
WHERE urs.total_reviews >= 1
ORDER BY urs.average_rating DESC, urs.total_reviews DESC;

-- Grant necessary permissions
GRANT SELECT ON review_statistics TO authenticated;
GRANT SELECT ON top_rated_users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
