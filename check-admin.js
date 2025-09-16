import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findAdminUsers() {
  try {
    console.log('🔍 Looking for admin users...')

    // Find users with ADMIN role
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        createdAt: true
      }
    })

    if (adminUsers.length === 0) {
      console.log('❌ No admin users found in database')

      // Check if there are any users at all
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          createdAt: true
        },
        take: 5
      })

      console.log('\n📋 All users in database:')
      allUsers.forEach(user => {
        console.log(`- ${user.email} (${user.role}) - ${user.name}`)
      })

      console.log('\n💡 No admin users found. You might need to:')
      console.log('1. Create an admin user manually')
      console.log('2. Update an existing user to have ADMIN role')
      console.log('3. Check if the database was reset and lost the admin user')
    } else {
      console.log(`✅ Found ${adminUsers.length} admin user(s):`)
      adminUsers.forEach(user => {
        console.log(`- Email: ${user.email}`)
        console.log(`  Name: ${user.name}`)
        console.log(`  Username: ${user.username}`)
        console.log(`  Role: ${user.role}`)
        console.log(`  Created: ${user.createdAt}`)
        console.log('')
      })
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findAdminUsers()
