import fetch from 'node-fetch';

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...');

    const response = await fetch('http://localhost:3000/api/seed-admin', {
      method: 'GET'
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@example.com');
      console.log('🔑 Password: password123');
      console.log('👤 Role: ADMIN');
      console.log('\n📋 Response:', data);
    } else {
      console.log('❌ Failed to create admin user:', data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure the development server is running on http://localhost:3000');
  }
}

createAdminUser();
