const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/debug/users',
  method: 'GET'
};

console.log('🔍 Checking all users in database...');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('📋 Users in database:', response);
    } catch (e) {
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
});

req.end();
