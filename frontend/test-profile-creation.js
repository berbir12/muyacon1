// Test script to verify profile creation issue is fixed
import { supabase } from './lib/supabase.js'

async function testProfileCreation() {
  try {
    console.log('Testing profile creation...')
    
    // 1. Check current profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, phone, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }
    
    console.log('Current profiles:', profiles)
    
    // 2. Check for duplicates
    const { data: duplicates, error: duplicatesError } = await supabase
      .from('profiles')
      .select('phone, count(*)')
      .not('phone', 'is', null)
      .group('phone')
      .having('count(*)', 'gt', 1)
    
    if (duplicatesError) {
      console.error('Error checking duplicates:', duplicatesError)
      return
    }
    
    console.log('Duplicate profiles:', duplicates)
    
    // 3. Check recent tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, customer_id, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return
    }
    
    console.log('Recent tasks:', tasks)
    
    // 4. Check if user_id in tasks references auth.users or profiles
    const { data: authUsers, error: authUsersError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(5)
    
    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError)
      return
    }
    
    console.log('Auth users:', authUsers)
    
    // Check if any task user_id matches auth.users.id
    const authUserIds = authUsers.map(u => u.id)
    const tasksWithAuthUserIds = tasks.filter(t => authUserIds.includes(t.user_id))
    const tasksWithProfileIds = tasks.filter(t => !authUserIds.includes(t.user_id))
    
    console.log('Tasks with auth.users.id as user_id:', tasksWithAuthUserIds.length)
    console.log('Tasks with profiles.id as user_id:', tasksWithProfileIds.length)
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

// Run the test
testProfileCreation()
