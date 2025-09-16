const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/seed-admin',
  method: 'GET'
};

console.log('🔧 Creating admin user...');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (res.statusCode === 200) {
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@example.com');
        console.log('🔑 Password: password123');
        console.log('👤 Role: ADMIN');
        console.log('\n📋 Full response:', response);
      } else {
        console.log('❌ Response:', response);
      }
    } catch (e) {
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
  console.log('\n💡 Make sure the development server is running on http://localhost:3000');
});

req.end();
