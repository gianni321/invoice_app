// Test script to reproduce the markPaid issue

async function testMarkPaid() {
  try {
    console.log('Testing mark paid functionality...');
    
    // First, let's check what invoices exist
    const listResponse = await fetch('http://localhost:3000/api/invoices', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsIm5hbWUiOiJBZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyODE3MzQxNCwiZXhwIjoxNzI4MTk1MDE0fQ.cFzwNrTj5cjFGvBOmODNZz3rwZEwY7BUzr7qIvMCsF8' // Admin token
      }
    });
    
    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.error('Failed to fetch invoices:', error);
      return;
    }
    
    const invoices = await listResponse.json();
    console.log('Available invoices:', invoices.map(i => `ID: ${i.id}, Status: ${i.status}`));
    
    // Find a submitted invoice to mark as paid
    const submittedInvoice = invoices.find(i => i.status === 'submitted' || i.status === 'approved');
    
    if (!submittedInvoice) {
      console.log('No submitted/approved invoices found to test with');
      return;
    }
    
    console.log(`Attempting to mark invoice ${submittedInvoice.id} as paid...`);
    
    // Try to mark as paid
    const markPaidResponse = await fetch(`http://localhost:3000/api/invoices/${submittedInvoice.id}/paid`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsIm5hbWUiOiJBZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcyODE3MzQxNCwiZXhwIjoxNzI4MTk1MDE0fQ.cFzwNrTj5cjFGvBOmODNZz3rwZEwY7BUzr7qIvMCsF8'
      }
    });
    
    console.log(`Response status: ${markPaidResponse.status}`);
    
    if (markPaidResponse.ok) {
      const result = await markPaidResponse.json();
      console.log('SUCCESS: Invoice marked as paid:', result);
    } else {
      const errorText = await markPaidResponse.text();
      console.error('ERROR: Failed to mark as paid:', errorText);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testMarkPaid();