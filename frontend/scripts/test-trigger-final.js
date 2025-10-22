const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://vhyjvrcueujjvskglvjq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoeWp2cmN1ZXVqanZza2dsdmpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1Mzk4MywiZXhwIjoyMDcwNjI5OTgzfQ.J7KqQslPqYa8rlvlzUFbfhNeF3iLxlq-tktekS6QlNs'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testTrigger() {
  try {
    console.log('🧪 Testing trigger functionality...')
    
    // 1. Get current applications
    console.log('\n1. Current applications:')
    const { data: applications, error: appError } = await supabase
      .from('tasker_applications')
      .select(`
        id,
        user_id,
        profile_id,
        status,
        full_name,
        profiles!inner(
          id,
          role,
          current_mode,
          tasker_application_status
        )
      `)
      .limit(3)
    
    if (appError) {
      console.error('Error fetching applications:', appError)
      return
    }
    
    console.table(applications)
    
    if (!applications || applications.length === 0) {
      console.log('No applications found to test with')
      return
    }
    
    // 2. Test with the first application
    const testApp = applications[0]
    console.log(`\n2. Testing with application: ${testApp.id}`)
    console.log(`Current status: ${testApp.status}`)
    console.log(`Profile before:`, testApp.profiles)
    
    // 3. Update the application status
    console.log('\n3. Updating application status...')
    const { error: updateError } = await supabase
      .from('tasker_applications')
      .update({ 
        status: 'approved', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', testApp.id)
    
    if (updateError) {
      console.error('Error updating application:', updateError)
      return
    }
    
    console.log('✅ Application updated successfully')
    
    // 4. Wait for trigger
    console.log('\n4. Waiting for trigger to execute...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 5. Check if profile was updated
    console.log('\n5. Checking if profile was updated...')
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, current_mode, tasker_application_status, updated_at')
      .eq('id', testApp.profile_id)
      .single()
    
    if (profileError) {
      console.error('Error fetching updated profile:', profileError)
      return
    }
    
    console.log('Profile after update:', updatedProfile)
    
    // 6. Check if trigger worked
    const expectedStatus = 'approved'
    const expectedRole = 'both'
    const expectedMode = 'tasker'
    
    if (updatedProfile.tasker_application_status === expectedStatus && 
        updatedProfile.role === expectedRole && 
        updatedProfile.current_mode === expectedMode) {
      console.log('\n✅ SUCCESS! Trigger is working correctly!')
      console.log('Profile was updated:')
      console.log(`- Status: ${testApp.profiles.tasker_application_status} → ${updatedProfile.tasker_application_status}`)
      console.log(`- Role: ${testApp.profiles.role} → ${updatedProfile.role}`)
      console.log(`- Mode: ${testApp.profiles.current_mode} → ${updatedProfile.current_mode}`)
    } else {
      console.log('\n❌ FAILED! Trigger is not working correctly!')
      console.log('Expected:')
      console.log(`- Status: ${expectedStatus}`)
      console.log(`- Role: ${expectedRole}`)
      console.log(`- Mode: ${expectedMode}`)
      console.log('Actual:')
      console.log(`- Status: ${updatedProfile.tasker_application_status}`)
      console.log(`- Role: ${updatedProfile.role}`)
      console.log(`- Mode: ${updatedProfile.current_mode}`)
    }
    
    // 7. Reset back to original status
    console.log('\n7. Resetting application back to original status...')
    await supabase
      .from('tasker_applications')
      .update({ 
        status: testApp.status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', testApp.id)
    
    console.log('✅ Application reset to original status')
    
  } catch (error) {
    console.error('Error testing trigger:', error)
  }
}

testTrigger()

