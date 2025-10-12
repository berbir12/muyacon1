-- Test database connection and current RLS state
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
FROM pg_tables t 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'tasks', 'task_applications', 'task_categories', 'task_status_updates', 'chats', 'messages', 'notifications', 'ratings', 'reviews', 'direct_bookings', 'categories')
ORDER BY tablename;

-- Test basic data access
SELECT COUNT(*) as profile_count FROM public.profiles;
SELECT COUNT(*) as task_count FROM public.tasks;
SELECT COUNT(*) as application_count FROM public.task_applications;
SELECT COUNT(*) as chat_count FROM public.chats;
SELECT COUNT(*) as message_count FROM public.messages;
