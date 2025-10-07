const http = require('http');

async function testLogin(pin) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ pin });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('Testing PIN authentication...\n');
  
  const testPins = ['0000', '1234', '5678', '9012', '9999'];
  
  for (const pin of testPins) {
    try {
      console.log(`Testing PIN: ${pin}`);
      const result = await testLogin(pin);
      console.log(`Status: ${result.statusCode}`);
      
      if (result.statusCode === 200) {
        console.log(`✅ Success - User: ${result.body.user.name} (${result.body.user.role})`);
      } else {
        console.log(`❌ Failed - ${result.body.error || 'Unknown error'}`);
      }
      console.log('---');
    } catch (error) {
      console.log(`❌ Error testing PIN ${pin}:`, error.message);
      console.log('---');
    }
  }
}

runTests();