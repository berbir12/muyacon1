import { supabase } from '../lib/supabase'

export interface Booking {
  id: string
  customer_id: string
  technician_id: string
  service_name: string
  service_description?: string
  base_price: number
  agreed_price: number
  price_type: 'hourly' | 'fixed' | 'negotiable'
  booking_date: string
  start_time: string
  end_time?: string
  estimated_duration_hours?: number
  city?: string
  state?: string
  address?: string
  zip_code?: string
  latitude?: number
  longitude?: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  total_amount?: number
  payment_status: 'pending' | 'paid' | 'refunded'
  customer_notes?: string
  technician_notes?: string
  special_instructions?: string
  created_at: string
  updated_at: string
  // Additional fields for display
  customer_name?: string
  technician_name?: string
  task_title?: string
  // Task-specific fields
  task_id?: string
  task_status?: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  task_category?: string
  is_task_based?: boolean
  chat_id?: string
}

export class BookingService {
  // Get all bookings for a user (as customer or technician)
  static async getUserBookings(userId: string): Promise<Booking[]> {
    try {
      // Get direct bookings
      const { data: directBookings, error: directError } = await supabase
        .from('direct_bookings')
        .select('*')
        .or(`customer_id.eq.${userId},technician_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (directError) throw directError
      
      console.log('BookingService: Found direct bookings:', directBookings?.length || 0)
      console.log('BookingService: Direct bookings:', directBookings?.map(booking => ({
        id: booking.id,
        customer_id: booking.customer_id,
        technician_id: booking.technician_id,
        service_name: booking.service_name
      })))

      // Get accepted task applications as bookings
      // Only show tasks where user is assigned to work on as a tasker
      // Exclude tasks that the user created (those should be in "My Tasks" not "Bookings")
      const { data: taskerApplications, error: taskerError } = await supabase
        .from('task_applications')
        .select(`
          id,
          task_id,
          tasker_id,
          proposed_price,
          status,
          created_at,
          updated_at,
          tasks!inner(
            id,
            title,
            description,
            budget,
            task_date,
            task_time,
            address,
            city,
            state,
            zip_code,
            customer_id
          )
        `)
        .eq('status', 'accepted')
        .eq('tasker_id', userId)
        .neq('tasks.customer_id', userId) // Exclude tasks created by the user
        .order('created_at', { ascending: false })

      if (taskerError) throw taskerError

      // Only use tasker applications (tasks assigned to the user)
      const taskApplications = taskerApplications || []
      
      console.log('BookingService: Found tasker applications:', taskApplications.length)
      console.log('BookingService: Current user ID:', userId)
      console.log('BookingService: Tasker applications:', taskApplications.map(app => ({
        id: app.id,
        task_id: app.task_id,
        tasker_id: app.tasker_id,
        customer_id: app.tasks.customer_id,
        title: app.tasks.title,
        isUserTasker: app.tasker_id === userId,
        isUserCustomer: app.tasks.customer_id === userId
      })))
      
      // Filter out any applications where user is the customer (extra safety check)
      const filteredApplications = taskApplications.filter(app => app.tasks.customer_id !== userId)
      console.log('BookingService: After filtering out customer tasks:', filteredApplications.length)

      // Convert task applications to booking format
      const taskBookings: Booking[] = (filteredApplications || []).map(app => ({
        id: `task_${app.id}`,
        customer_id: app.tasks.customer_id,
        technician_id: app.tasker_id,
        service_name: app.tasks.title,
        service_description: app.tasks.description,
        base_price: app.tasks.budget,
        agreed_price: app.proposed_price || app.tasks.budget,
        price_type: 'fixed' as const,
        booking_date: app.tasks.task_date || new Date().toISOString().split('T')[0],
        start_time: app.tasks.task_time || '09:00',
        end_time: undefined,
        estimated_duration_hours: undefined,
        city: app.tasks.city,
        state: app.tasks.state,
        address: app.tasks.address,
        zip_code: app.tasks.zip_code,
        latitude: undefined,
        longitude: undefined,
        status: 'confirmed' as const,
        total_amount: app.proposed_price || app.tasks.budget,
        payment_status: 'pending' as const,
        customer_notes: undefined,
        technician_notes: undefined,
        special_instructions: undefined,
        created_at: app.created_at,
        updated_at: app.updated_at,
        technician_name: undefined,
        task_title: app.tasks.title,
        // Task-specific fields
        task_id: app.tasks.id,
        task_status: 'assigned' as const,
        task_category: 'Task',
        is_task_based: true,
        chat_id: undefined // Will be populated later
      }))

      // Get all unique user IDs for name lookup
      const allCustomerIds = [
        ...new Set([
          ...(directBookings?.map(b => b.customer_id) || []),
          ...taskBookings.map(b => b.customer_id)
        ])
      ]
      const allTechnicianIds = [
        ...new Set([
          ...(directBookings?.map(b => b.technician_id) || []),
          ...taskBookings.map(b => b.technician_id)
        ])
      ]

      // Get names for all users
      const [customerResults, technicianResults, taskCustomerNames] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', allCustomerIds),
        supabase.from('profiles').select('id, full_name').in('id', allTechnicianIds),
        supabase.from('profiles').select('id, full_name').in('id', taskBookings.map(b => b.customer_id))
      ])

      const customerMap = new Map(customerResults.data?.map(p => [p.id, p.full_name]) || [])
      const technicianMap = new Map(technicianResults.data?.map(p => [p.id, p.full_name]) || [])

      // Combine and format all bookings
      const allBookings = [
        ...(directBookings?.map(booking => ({
          ...booking,
          customer_name: customerMap.get(booking.customer_id),
          technician_name: technicianMap.get(booking.technician_id),
          task_title: booking.service_name
        })) || []),
        ...taskBookings.map(booking => ({
          ...booking,
          customer_name: customerMap.get(booking.customer_id),
          technician_name: technicianMap.get(booking.technician_id)
        }))
      ]

      // Sort by creation date
      return allBookings.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } catch (error) {
      console.error('Error getting user bookings:', error)
      return []
    }
  }

  // Get bookings by status
  static async getBookingsByStatus(userId: string, status: Booking['status']): Promise<Booking[]> {
    try {
      const bookings = await this.getUserBookings(userId)
      return bookings.filter(booking => booking.status === status)
    } catch (error) {
      console.error('Error getting bookings by status:', error)
      return []
    }
  }

  // Create a new booking
  static async createBooking(bookingData: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'customer_name' | 'technician_name' | 'task_title'>): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from('direct_bookings')
        .insert([bookingData])
        .select('*')
        .single()

      if (error) throw error

      // Get customer and technician names
      const [customerResult, technicianResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', data.customer_id).single(),
        supabase.from('profiles').select('full_name').eq('id', data.technician_id).single()
      ])

      return {
        ...data,
        customer_name: customerResult.data?.full_name,
        technician_name: technicianResult.data?.full_name,
        task_title: data.service_name
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      throw error
    }
  }

  // Update booking status
  static async updateBookingStatus(bookingId: string, status: Booking['status']): Promise<boolean> {
    try {
      // Check if this is a task-based booking
      if (bookingId.startsWith('task_')) {
        const taskApplicationId = bookingId.replace('task_', '')
        
        // Map booking status to task application status
        let taskStatus: string
        switch (status) {
          case 'confirmed':
            taskStatus = 'accepted'
            break
          case 'cancelled':
            taskStatus = 'rejected'
            break
          case 'completed':
            taskStatus = 'completed'
            break
          default:
            taskStatus = 'accepted'
        }

        const { error } = await supabase
          .from('task_applications')
          .update({
            status: taskStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskApplicationId)

        if (error) throw error
        return true
      } else {
        // Handle direct bookings
        const updateData: any = {
          status,
          updated_at: new Date().toISOString()
        }

        const { error } = await supabase
          .from('direct_bookings')
          .update(updateData)
          .eq('id', bookingId)

        if (error) throw error
        return true
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      return false
    }
  }

  // Update booking details
  static async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('direct_bookings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating booking:', error)
      return false
    }
  }

  // Cancel booking
  static async cancelBooking(bookingId: string, reason?: string): Promise<boolean> {
    try {
      const success = await this.updateBookingStatus(bookingId, 'cancelled')
      if (success && reason) {
        await this.updateBooking(bookingId, { special_instructions: reason })
      }
      return success
    } catch (error) {
      console.error('Error cancelling booking:', error)
      return false
    }
  }

  // Complete booking
  static async completeBooking(bookingId: string, notes?: string): Promise<boolean> {
    try {
      const success = await this.updateBookingStatus(bookingId, 'completed')
      if (success && notes) {
        await this.updateBooking(bookingId, { technician_notes: notes })
      }
      return success
    } catch (error) {
      console.error('Error completing booking:', error)
      return false
    }
  }

  // Get booking by ID
  static async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      // Check if this is a task-based booking
      if (bookingId.startsWith('task_')) {
        const taskApplicationId = bookingId.replace('task_', '')
        
        const { data, error } = await supabase
          .from('task_applications')
          .select(`
            id,
            task_id,
            tasker_id,
            proposed_price,
            status,
            created_at,
            updated_at,
            tasks!inner(
              id,
              title,
              description,
              budget,
              task_date,
              task_time,
              address,
              city,
              state,
              zip_code,
              customer_id
            )
          `)
          .eq('id', taskApplicationId)
          .single()

        if (error) throw error

        // Fetch customer and technician names
        const [customerProfile, technicianProfile] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.tasks.customer_id)
            .single(),
          supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.tasker_id)
            .single()
        ])

        // Convert to booking format
        const booking: Booking = {
          id: `task_${data.id}`,
          customer_id: data.tasks.customer_id,
          technician_id: data.tasker_id,
          service_name: data.tasks.title,
          service_description: data.tasks.description,
          base_price: data.tasks.budget,
          agreed_price: data.proposed_price || data.tasks.budget,
          price_type: 'fixed' as const,
          booking_date: data.tasks.task_date || new Date().toISOString().split('T')[0],
          start_time: data.tasks.task_time || '09:00',
          end_time: undefined,
          estimated_duration_hours: undefined,
          city: data.tasks.city,
          state: data.tasks.state,
          address: data.tasks.address,
          zip_code: data.tasks.zip_code,
          latitude: undefined,
          longitude: undefined,
          status: 'confirmed' as const,
          total_amount: data.proposed_price || data.tasks.budget,
          payment_status: 'pending' as const,
          customer_notes: undefined,
          technician_notes: undefined,
          special_instructions: undefined,
          created_at: data.created_at,
          updated_at: data.updated_at,
          customer_name: customerProfile.data?.full_name || 'Customer',
          technician_name: technicianProfile.data?.full_name || 'Tasker',
          task_title: data.tasks.title
        }

        return booking
      } else {
        // Handle direct bookings
        const { data, error } = await supabase
          .from('direct_bookings')
          .select('*')
          .eq('id', bookingId)
          .single()

        if (error) throw error

        // Get customer and technician names
        const [customerResult, technicianResult] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', data.customer_id).single(),
          supabase.from('profiles').select('full_name').eq('id', data.technician_id).single()
        ])

        return {
          ...data,
          customer_name: customerResult.data?.full_name,
          technician_name: technicianResult.data?.full_name,
          task_title: data.service_name
        }
      }
    } catch (error) {
      console.error('Error getting booking by ID:', error)
      return null
    }
  }

  // Search bookings
  static async searchBookings(userId: string, query: string): Promise<Booking[]> {
    try {
      // Get all bookings first
      const allBookings = await this.getUserBookings(userId)
      
      // Filter by search query
      const filteredBookings = allBookings.filter(booking => 
        booking.service_name.toLowerCase().includes(query.toLowerCase()) ||
        booking.service_description?.toLowerCase().includes(query.toLowerCase()) ||
        booking.address?.toLowerCase().includes(query.toLowerCase()) ||
        booking.customer_name?.toLowerCase().includes(query.toLowerCase()) ||
        booking.technician_name?.toLowerCase().includes(query.toLowerCase())
      )

      return filteredBookings
    } catch (error) {
      console.error('Error searching bookings:', error)
      return []
    }
  }

  // Get upcoming bookings
  static async getUpcomingBookings(userId: string): Promise<Booking[]> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get all bookings first
      const allBookings = await this.getUserBookings(userId)
      
      // Filter for upcoming bookings
      const upcomingBookings = allBookings.filter(booking => {
        const bookingDate = booking.booking_date
        return bookingDate >= today && 
               (booking.status === 'confirmed' || booking.status === 'in_progress')
      })

      // Sort by date and time
      return upcomingBookings.sort((a, b) => {
        const dateCompare = a.booking_date.localeCompare(b.booking_date)
        if (dateCompare !== 0) return dateCompare
        return a.start_time.localeCompare(b.start_time)
      })
    } catch (error) {
      console.error('Error getting upcoming bookings:', error)
      return []
    }
  }

  // Get booking statistics
  static async getBookingStats(userId: string): Promise<{
    total: number
    pending: number
    confirmed: number
    in_progress: number
    completed: number
    cancelled: number
  }> {
    try {
      const bookings = await this.getUserBookings(userId)
      
      return {
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        in_progress: bookings.filter(b => b.status === 'in_progress').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
      }
    } catch (error) {
      console.error('Error getting booking stats:', error)
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      }
    }
  }

  // Get or create chat for a booking
  static async getOrCreateChatForBooking(bookingId: string, customerId: string, technicianId: string): Promise<string | null> {
    try {
      // Check if chat already exists
      const { data: existingChat, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .eq('customer_id', customerId)
        .eq('tasker_id', technicianId)
        .single()

      if (existingChat) {
        return existingChat.id
      }

      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert([{
          customer_id: customerId,
          tasker_id: technicianId,
          booking_id: bookingId
        }])
        .select('id')
        .single()

      if (createError) throw createError
      return newChat.id
    } catch (error) {
      console.error('Error getting/creating chat for booking:', error)
      return null
    }
  }

  // Update booking status and sync with task status
  static async updateBookingAndTaskStatus(bookingId: string, status: Booking['status'], updatedByUserId?: string): Promise<boolean> {
    try {
      console.log('BookingService: Updating booking status', { bookingId, status, updatedByUserId })
      
      // Check if this is a task-based booking
      if (bookingId.startsWith('task_')) {
        const taskApplicationId = bookingId.replace('task_', '')
        
        // Get the task application to find the task_id and current status
        const { data: application, error: appError } = await supabase
          .from('task_applications')
          .select(`
            task_id,
            status,
            tasks!inner(
              id,
              status,
              customer_id,
              tasker_id,
              title
            )
          `)
          .eq('id', taskApplicationId)
          .single()

        if (appError) {
          console.error('BookingService: Error getting application:', appError)
          throw appError
        }

        console.log('BookingService: Found application:', application)

        // Map booking status to task application and task status
        let taskAppStatus: string
        let taskStatus: string

        switch (status) {
          case 'pending':
            taskAppStatus = 'pending'
            taskStatus = 'open'
            break
          case 'confirmed':
            taskAppStatus = 'accepted'
            taskStatus = 'assigned'
            break
          case 'in_progress':
            taskAppStatus = 'accepted'
            taskStatus = 'in_progress'
            break
          case 'completed':
            taskAppStatus = 'completed'
            taskStatus = 'completed'
            break
          case 'cancelled':
            taskAppStatus = 'rejected'
            taskStatus = 'cancelled'
            break
          default:
            taskAppStatus = 'accepted'
            taskStatus = 'assigned'
        }

        console.log('BookingService: Updating application status', { taskAppStatus, taskStatus })

        // Update task application status
        const { error: appUpdateError } = await supabase
          .from('task_applications')
          .update({
            status: taskAppStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskApplicationId)

        if (appUpdateError) {
          console.error('BookingService: Error updating application:', appUpdateError)
          throw appUpdateError
        }

        // Update task status with proper validation
        const { error: taskUpdateError } = await supabase
          .from('tasks')
          .update({
            status: taskStatus,
            updated_at: new Date().toISOString(),
            // Set completion/cancellation timestamps
            ...(status === 'completed' && { completed_at: new Date().toISOString() }),
            ...(status === 'cancelled' && { cancelled_at: new Date().toISOString() })
          })
          .eq('id', application.task_id)

        if (taskUpdateError) {
          console.error('BookingService: Error updating task:', taskUpdateError)
          throw taskUpdateError
        }

        console.log('BookingService: Successfully updated booking and task status')

        // Create status update record for audit trail
        const { error: statusUpdateError } = await supabase
          .from('task_status_updates')
          .insert({
            task_id: application.task_id,
            status: taskStatus as any,
            updated_by: updatedByUserId || application.tasks.customer_id,
            reason: `Booking status changed to ${status}`,
            notes: `Booking ${bookingId} status updated to ${status}`
          })

        if (statusUpdateError) {
          console.error('Error creating status update record:', statusUpdateError)
          // Don't fail the main operation
        }

        // Send notifications
        await this.sendBookingStatusNotifications(application.tasks, status, application.task_id)

        return true
      } else {
        // Handle direct bookings
        const updateData: any = {
          status,
          updated_at: new Date().toISOString()
        }

        const { error } = await supabase
          .from('direct_bookings')
          .update(updateData)
          .eq('id', bookingId)

        if (error) throw error
        return true
      }
    } catch (error) {
      console.error('Error updating booking and task status:', error)
      return false
    }
  }

  // Send notifications when booking status changes
  private static async sendBookingStatusNotifications(
    task: any,
    bookingStatus: Booking['status'],
    taskId: string
  ): Promise<void> {
    try {
      const { PushNotificationService } = await import('./PushNotificationService')
      const { SimpleNotificationService } = await import('./SimpleNotificationService')

      const statusMessages = {
        'pending': 'Your booking is pending approval',
        'confirmed': 'Your booking has been confirmed',
        'in_progress': 'Your booking is now in progress',
        'completed': 'Your booking has been completed',
        'cancelled': 'Your booking has been cancelled'
      }

      const message = statusMessages[bookingStatus]
      if (message) {
        // Notify customer
        await SimpleNotificationService.createTaskNotification(
          task.title,
          bookingStatus === 'completed' ? 'completed' : 'updated',
          message
        )
        
        await PushNotificationService.createTaskNotification(
          task.title,
          taskId,
          'System',
          message
        )

        // Notify tasker if assigned
        if (task.tasker_id) {
          await SimpleNotificationService.createTaskNotification(
            task.title,
            bookingStatus === 'completed' ? 'completed' : 'updated',
            message
          )
          
          await PushNotificationService.createTaskNotification(
            task.title,
            taskId,
            'System',
            message
          )
        }
      }
    } catch (error) {
      console.error('Error sending booking status notifications:', error)
    }
  }
}
