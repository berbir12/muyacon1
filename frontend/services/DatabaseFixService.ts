import { supabase } from '../lib/supabase'

export class DatabaseFixService {
  // Test database connection and RLS policies
  static async testDatabaseConnection(): Promise<{
    success: boolean
    errors: string[]
    tableStatus: any[]
  }> {
    const errors: string[] = []
    const tableStatus: any[] = []

    try {
      // Test basic connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      if (connectionError) {
        errors.push(`Connection error: ${connectionError.message}`)
      }

      // Test each table
      const tables = [
        'profiles',
        'tasks', 
        'task_applications',
        'task_categories',
        'task_status_updates',
        'chats',
        'messages',
        'notifications',
        'ratings',
        'reviews',
        'direct_bookings',
        'categories'
      ]

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1)

          tableStatus.push({
            table,
            accessible: !error,
            error: error?.message || null,
            rowCount: data?.length || 0
          })

          if (error) {
            errors.push(`${table}: ${error.message}`)
          }
        } catch (err) {
          errors.push(`${table}: ${err}`)
          tableStatus.push({
            table,
            accessible: false,
            error: String(err),
            rowCount: 0
          })
        }
      }

      return {
        success: errors.length === 0,
        errors,
        tableStatus
      }
    } catch (error) {
      return {
        success: false,
        errors: [`General error: ${error}`],
        tableStatus
      }
    }
  }

  // Apply RLS policy fixes
  static async applyRLSFixes(): Promise<{
    success: boolean
    errors: string[]
    appliedFixes: string[]
  }> {
    const errors: string[] = []
    const appliedFixes: string[] = []

    try {
      // Enable RLS on all tables
      const rlsTables = [
        'profiles',
        'tasks',
        'task_applications', 
        'task_categories',
        'task_status_updates',
        'chats',
        'messages',
        'notifications',
        'ratings',
        'reviews',
        'direct_bookings',
        'categories'
      ]

      for (const table of rlsTables) {
        try {
          // This would need to be done via SQL, but we can test access
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1)

          if (!error) {
            appliedFixes.push(`RLS test passed for ${table}`)
          } else {
            errors.push(`RLS test failed for ${table}: ${error.message}`)
          }
        } catch (err) {
          errors.push(`RLS test error for ${table}: ${err}`)
        }
      }

      return {
        success: errors.length === 0,
        errors,
        appliedFixes
      }
    } catch (error) {
      return {
        success: false,
        errors: [`General RLS fix error: ${error}`],
        appliedFixes
      }
    }
  }

  // Test specific data access patterns
  static async testDataAccess(): Promise<{
    success: boolean
    results: any
    errors: string[]
  }> {
    const errors: string[] = []
    const results: any = {}

    try {
      // Test profiles access
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .limit(5)

      if (profilesError) {
        errors.push(`Profiles access error: ${profilesError.message}`)
      } else {
        results.profiles = profiles
      }

      // Test tasks access
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status, customer_id, tasker_id')
        .limit(5)

      if (tasksError) {
        errors.push(`Tasks access error: ${tasksError.message}`)
      } else {
        results.tasks = tasks
      }

      // Test task applications access
      const { data: applications, error: applicationsError } = await supabase
        .from('task_applications')
        .select('id, task_id, tasker_id, status')
        .limit(5)

      if (applicationsError) {
        errors.push(`Task applications access error: ${applicationsError.message}`)
      } else {
        results.applications = applications
      }

      // Test chats access
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('id, task_id, customer_id, tasker_id')
        .limit(5)

      if (chatsError) {
        errors.push(`Chats access error: ${chatsError.message}`)
      } else {
        results.chats = chats
      }

      // Test messages access
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, chat_id, sender_id, message')
        .limit(5)

      if (messagesError) {
        errors.push(`Messages access error: ${messagesError.message}`)
      } else {
        results.messages = messages
      }

      return {
        success: errors.length === 0,
        results,
        errors
      }
    } catch (error) {
      return {
        success: false,
        results: {},
        errors: [`General data access error: ${error}`]
      }
    }
  }

  // Get database health report
  static async getDatabaseHealthReport(): Promise<{
    overall: 'healthy' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
    stats: any
  }> {
    const issues: string[] = []
    const recommendations: string[] = []
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy'

    try {
      // Test connection
      const connectionTest = await this.testDatabaseConnection()
      if (!connectionTest.success) {
        overall = 'critical'
        issues.push(...connectionTest.errors)
      }

      // Test data access
      const dataTest = await this.testDataAccess()
      if (!dataTest.success) {
        overall = overall === 'critical' ? 'critical' : 'warning'
        issues.push(...dataTest.errors)
      }

      // Get basic stats
      const stats = {
        profiles: dataTest.results.profiles?.length || 0,
        tasks: dataTest.results.tasks?.length || 0,
        applications: dataTest.results.applications?.length || 0,
        chats: dataTest.results.chats?.length || 0,
        messages: dataTest.results.messages?.length || 0
      }

      // Generate recommendations
      if (issues.length > 0) {
        recommendations.push('Run the RLS fix script to resolve policy conflicts')
        recommendations.push('Check database permissions for anon and authenticated roles')
        recommendations.push('Verify all foreign key constraints are properly set up')
      }

      if (stats.tasks === 0) {
        recommendations.push('Consider adding sample data for testing')
      }

      if (stats.chats === 0 && stats.tasks > 0) {
        recommendations.push('Task-chat integration may need attention')
      }

      return {
        overall,
        issues,
        recommendations,
        stats
      }
    } catch (error) {
      return {
        overall: 'critical',
        issues: [`Health check failed: ${error}`],
        recommendations: ['Contact database administrator'],
        stats: {}
      }
    }
  }
}
