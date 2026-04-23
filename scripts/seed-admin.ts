import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN }
    })

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email)
      return
    }

    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ticketnow.com'
    const adminName = process.env.ADMIN_NAME || 'Administrador TicketNow'

    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        full_name: adminName,
        role: UserRole.ADMIN,
        provider: 'email',
        active: true
      }
    })

    console.log('✅ Admin user created successfully:')
    console.log(`   Email: ${adminUser.email}`)
    console.log(`   Name: ${adminUser.full_name}`)
    console.log(`   Role: ${adminUser.role}`)
    console.log(`   ID: ${adminUser.id}`)
    console.log('')
    console.log('📝 Next steps:')
    console.log('1. Set up Google OAuth in your .env file')
    console.log('2. Login with Google using the admin email')
    console.log('3. Access /admin to manage users and roles')
    console.log('')
    console.log('⚠️  Important: Keep this admin email secure!')

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
