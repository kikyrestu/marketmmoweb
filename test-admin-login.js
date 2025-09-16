const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAdminLogin() {
  try {
    console.log('🔍 Testing admin login...');

    // Get the admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }

    console.log('📧 Admin email:', admin.email);
    console.log('👤 Admin name:', admin.name);
    console.log('🔒 Hashed password exists:', !!admin.hashedPassword);

    // Test password comparison
    const testPassword = 'password123';
    const isValid = await bcrypt.compare(testPassword, admin.hashedPassword);

    console.log('✅ Password valid:', isValid);

    if (isValid) {
      console.log('🎉 Admin credentials are working!');
      console.log('📧 Email: admin@example.com');
      console.log('🔑 Password: password123');
    } else {
      console.log('❌ Password is not working');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminLogin();
