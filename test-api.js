const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testLogin() {
  console.log('Testing login...');
  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const loginData = JSON.stringify({ pin: '1234' });
  
  try {
    const result = await makeRequest(loginOptions, loginData);
    console.log('Login result:', result);
    return result.body.token;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

async function testInvoiceSubmission(token) {
  console.log('\nTesting invoice submission...');
  const submitOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/invoices/submit',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  try {
    const result = await makeRequest(submitOptions, '{}');
    console.log('Invoice submission result:', result);
    return result;
  } catch (error) {
    console.error('Invoice submission error:', error);
    return null;
  }
}

async function main() {
  const token = await testLogin();
  if (token) {
    await testInvoiceSubmission(token);
  }
}

main().catch(console.error);