// Simple test to check the new Tuesday deadline system

async function testDeadlineSystem() {
  try {
    console.log('🧪 Testing Tuesday Deadline System...\n');

    // Test 1: Login
    console.log('1️⃣ Testing login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234' })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log(`✅ Login successful for user: ${loginData.user.name}`);
    console.log(`   Rate: $${loginData.user.rate}/hr`);

    const token = loginData.token;

    // Test 2: Check deadline status
    console.log('\n2️⃣ Testing deadline status API...');
    const statusResponse = await fetch('http://localhost:3000/api/invoices/deadline-status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!statusResponse.ok) {
      throw new Error(`Deadline status failed: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    console.log(`✅ Deadline status retrieved`);
    console.log(`   Zone: ${statusData.zone}`);
    console.log(`   Warning window: ${statusData.warnWindowHours} hours`);
    
    if (statusData.currentPeriod) {
      console.log(`   Current work week: ${statusData.currentPeriod.start.split('T')[0]} to ${statusData.currentPeriod.end.split('T')[0]}`);
      console.log(`   Due date: ${new Date(statusData.currentPeriod.due).toLocaleString()}`);
    }

    // Show user status
    const myStatus = statusData.statuses.find(s => s.userId === loginData.user.id);
    if (myStatus) {
      console.log(`\n👤 ${myStatus.userName}'s Status:`);
      console.log(`   Submitted: ${myStatus.submitted ? 'Yes ✅' : 'No ❌'}`);
      console.log(`   Status: ${myStatus.status}`);
      console.log(`   Deadline: ${new Date(myStatus.deadline_local).toLocaleString()}`);
      if (myStatus.message) {
        console.log(`   Message: ${myStatus.message}`);
      }
    }

    // Test 3: Check open entries
    console.log('\n3️⃣ Testing open entries...');
    const entriesResponse = await fetch('http://localhost:3000/api/entries?scope=open', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!entriesResponse.ok) {
      throw new Error(`Entries failed: ${entriesResponse.status}`);
    }

    const entriesData = await entriesResponse.json();
    console.log(`✅ Found ${entriesData.length} open entries`);
    
    entriesData.forEach(entry => {
      console.log(`   📅 ${entry.date}: ${entry.hours}h - ${entry.task}`);
    });

    // Test 4: Try invoice submission (this will show if period filtering works)
    console.log('\n4️⃣ Testing invoice submission...');
    const submitResponse = await fetch('http://localhost:3000/api/invoices/submit', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({})
    });

    console.log(`   Response status: ${submitResponse.status}`);
    const submitData = await submitResponse.json();
    
    if (submitResponse.ok) {
      console.log(`✅ Invoice submitted successfully!`);
      console.log(`   Invoice ID: ${submitData.invoice.id}`);
      console.log(`   Total: $${submitData.invoice.total}`);
      console.log(`   Period: ${submitData.invoice.period_start.split('T')[0]} to ${submitData.invoice.period_end.split('T')[0]}`);
    } else {
      console.log(`⚠️ Invoice submission failed: ${submitData.error}`);
      console.log(`   This is expected if there's already an invoice for this period or no entries in current period`);
    }

    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDeadlineSystem();