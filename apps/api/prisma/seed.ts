import { PrismaClient, Role, BotVersionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Demo Company',
      domain: 'demo.com',
    },
  });
  console.log('✅ Created tenant:', tenant.name);

  // Create owner user
  const passwordHash = await bcrypt.hash('password123', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      email: 'owner@demo.com',
      passwordHash,
      name: 'Owner User',
      tenantId: tenant.id,
    },
  });
  console.log('✅ Created owner user:', owner.email);

  // Assign OWNER role
  const roleAssignment = await prisma.roleAssignment.upsert({
    where: {
      userId_tenantId_role: {
        userId: owner.id,
        tenantId: tenant.id,
        role: Role.OWNER,
      },
    },
    update: {},
    create: {
      userId: owner.id,
      tenantId: tenant.id,
      role: Role.OWNER,
    },
  });
  console.log('✅ Assigned OWNER role');

  // Create sample bot
  const bot = await prisma.bot.create({
    data: {
      tenantId: tenant.id,
      name: 'Welcome Bot',
      description: 'A sample welcome bot',
      settings: {
        approvalRequired: false,
        kbOnly: false,
      },
    },
  });
  console.log('✅ Created bot:', bot.name);

  // Create draft flow graph
  const flowGraph = await prisma.flowGraph.create({
    data: {
      botId: bot.id,
      isDraft: true,
      nodes: [
        {
          id: 'start-1',
          type: 'Start',
          position: { x: 100, y: 100 },
          data: {
            label: 'Start',
          },
        },
        {
          id: 'message-1',
          type: 'Message',
          position: { x: 300, y: 100 },
          data: {
            label: 'Welcome Message',
            content: 'Hello! Welcome to our service. How can I help you today?',
          },
        },
        {
          id: 'end-1',
          type: 'End',
          position: { x: 500, y: 100 },
          data: {
            label: 'End',
          },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'start-1',
          target: 'message-1',
          type: 'default',
        },
        {
          id: 'edge-2',
          source: 'message-1',
          target: 'end-1',
          type: 'default',
        },
      ],
      variables: {},
    },
  });
  console.log('✅ Created draft flow graph');

  console.log('🎉 Seeding completed!');
  console.log('\n📝 Login credentials:');
  console.log('   Email: owner@demo.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

