// Test script za rezervacije - pokrenuti u browser console
// ili kreirati kao temporary React komponentu za testiranje

const testReservation = async () => {
  console.log('🧪 Starting reservation test...');
  
  // Test data
  const testReservationData = {
    guestName: 'Test Guest ' + Date.now(),
    date: '2025-06-21',
    time: '18:00',
    numberOfGuests: 4,
    zoneId: 'test-zone-id',
    tableIds: ['table-1', 'table-2'],
    phone: '+381641234567',
    email: 'test@example.com',
    notes: 'Test reservation',
    color: '#8B5CF6',
    status: 'waiting'
  };
  
  console.log('📝 Test reservation data:', testReservationData);
  
  try {
    // Pokušajemo direktno preko Supabase klijenta
    const { supabase } = await import('../utils/supabaseClient.js');
    
    console.log('🔍 Checking current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user:', userError);
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Test 1: Direct Supabase insert
    console.log('🧪 Test 1: Direct Supabase insert...');
    const dbData = {
      user_id: user.id,
      guest_name: testReservationData.guestName,
      date: testReservationData.date,
      time: testReservationData.time,
      number_of_guests: testReservationData.numberOfGuests,
      zone_id: testReservationData.zoneId,
      table_ids: testReservationData.tableIds, // Should work with JSONB
      phone: testReservationData.phone,
      email: testReservationData.email,
      notes: testReservationData.notes,
      color: testReservationData.color,
      status: testReservationData.status
    };
    
    console.log('📤 Inserting to Supabase:', dbData);
    
    const { data, error } = await supabase
      .from('reservations')
      .insert(dbData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase insert error:', error);
      console.error('📋 Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return;
    }
    
    console.log('✅ Direct insert successful:', data);
    
    // Test 2: Using reservationsService
    console.log('🧪 Test 2: Using reservationsService...');
    const { reservationsService } = await import('../services/reservationsService.js');
    
    const serviceTestData = {
      ...testReservationData,
      guestName: 'Service Test ' + Date.now(),
      user_id: user.id
    };
    
    const serviceResult = await reservationsService.createReservation(serviceTestData);
    console.log('✅ Service insert successful:', serviceResult);
    
    // Test 3: Fetch all reservations
    console.log('🧪 Test 3: Fetching all reservations...');
    const allReservations = await reservationsService.getAll(user.id);
    console.log('📊 All reservations:', allReservations);
    
    // Cleanup test data
    console.log('🧹 Cleaning up test data...');
    await supabase
      .from('reservations')
      .delete()
      .eq('guest_name', testReservationData.guestName);
    
    await supabase
      .from('reservations')
      .delete()
      .eq('guest_name', serviceTestData.guestName);
    
    console.log('✅ Tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('📋 Error stack:', error.stack);
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testReservation };
} else if (typeof window !== 'undefined') {
  window.testReservation = testReservation;
}

console.log('🧪 Test function loaded. Run testReservation() to start testing.'); 