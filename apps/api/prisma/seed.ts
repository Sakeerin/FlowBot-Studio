import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  // await prisma.auditLog.deleteMany();
  // await prisma.traceSpan.deleteMany();
  // await prisma.message.deleteMany();
  // await prisma.conversationSession.deleteMany();
  // await prisma.handoffTicket.deleteMany();
  // await prisma.knowledgeChunk.deleteMany();
  // await prisma.knowledgeSource.deleteMany();
  // await prisma.knowledgeCollection.deleteMany();
  // await prisma.toolSecret.deleteMany();
  // await prisma.tool.deleteMany();
  // await prisma.channelConnection.deleteMany();
  // await prisma.flowGraph.deleteMany();
  // await prisma.botVersion.deleteMany();
  // await prisma.bot.deleteMany();
  // await prisma.roleAssignment.deleteMany();
  // await prisma.user.deleteMany();
  // await prisma.tenant.deleteMany();

  // 1. Create Tenants
  console.log('Creating tenants...');
  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'Acme Corporation',
      domain: 'acme',
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Demo Company',
      domain: 'demo',
    },
  });

  // 2. Create Users with Roles
  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      passwordHash,
      name: 'Admin User',
      tenantId: tenant1.id,
      roleAssignments: {
        create: [
          { tenantId: tenant1.id, role: Role.OWNER },
          { tenantId: tenant1.id, role: Role.ADMIN },
        ],
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'builder@acme.com',
      passwordHash,
      name: 'Builder User',
      tenantId: tenant1.id,
      roleAssignments: {
        create: [{ tenantId: tenant1.id, role: Role.BUILDER }],
      },
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'agent@acme.com',
      passwordHash,
      name: 'Agent User',
      tenantId: tenant1.id,
      roleAssignments: {
        create: [{ tenantId: tenant1.id, role: Role.AGENT }],
      },
    },
  });

  const demoAdmin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash,
      name: 'Demo Admin',
      tenantId: tenant2.id,
      roleAssignments: {
        create: [
          { tenantId: tenant2.id, role: Role.OWNER },
          { tenantId: tenant2.id, role: Role.ADMIN },
        ],
      },
    },
  });

  // 3. Create Bots with Flow Graphs
  console.log('Creating bots...');
  const welcomeBot = await prisma.bot.create({
    data: {
      tenantId: tenant1.id,
      name: 'Welcome Bot',
      description: 'A simple welcome bot for new users',
      settings: {
        kbOnly: false,
      },
    },
  });

  const customerSupportBot = await prisma.bot.create({
    data: {
      tenantId: tenant1.id,
      name: 'Customer Support Bot',
      description: 'Customer support chatbot with handoff capability',
      settings: {
        kbOnly: false,
        allowedToolIds: [],
      },
    },
  });

  // 4. Create Flow Graphs (Draft)
  const welcomeFlowGraph = {
    nodes: [
      {
        id: 'start-1',
        type: 'Start',
        data: { label: 'Start' },
        position: { x: 100, y: 100 },
      },
      {
        id: 'message-1',
        type: 'Message',
        data: {
          label: 'Welcome Message',
          content: 'Hello! Welcome to our service. How can I help you today?',
        },
        position: { x: 300, y: 100 },
      },
      {
        id: 'end-1',
        type: 'End',
        data: { label: 'End' },
        position: { x: 500, y: 100 },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'message-1' },
      { id: 'e2', source: 'message-1', target: 'end-1' },
    ],
  };

  const supportFlowGraph = {
    nodes: [
      {
        id: 'start-1',
        type: 'Start',
        data: { label: 'Start' },
        position: { x: 100, y: 100 },
      },
      {
        id: 'message-1',
        type: 'Message',
        data: {
          label: 'Welcome',
          content:
            "Hello! I'm your customer support assistant. How can I help you today?\n\nI can help with:\n- Product inquiries\n- Technical support\n- Billing questions\n- Or connect you with a human agent",
        },
        position: { x: 300, y: 100 },
      },
      {
        id: 'router-1',
        type: 'Router',
        data: {
          label: 'Route Intent',
          intents: [
            { keyword: 'product', nextNodeId: 'message-2' },
            { keyword: 'billing', nextNodeId: 'message-3' },
            { keyword: 'agent', nextNodeId: 'handoff-1' },
            { default: 'handoff-1' },
          ],
        },
        position: { x: 500, y: 100 },
      },
      {
        id: 'message-2',
        type: 'Message',
        data: {
          label: 'Product Info',
          content:
            'Our products are designed to help you achieve your goals. Would you like more specific information?',
        },
        position: { x: 700, y: 0 },
      },
      {
        id: 'message-3',
        type: 'Message',
        data: {
          label: 'Billing Info',
          content: 'For billing questions, please provide your account number or email address.',
        },
        position: { x: 700, y: 100 },
      },
      {
        id: 'handoff-1',
        type: 'Handoff',
        data: {
          label: 'Handoff to Agent',
          priority: 'normal',
          message: 'Connecting you with a support agent...',
        },
        position: { x: 700, y: 200 },
      },
      {
        id: 'end-1',
        type: 'End',
        data: { label: 'End' },
        position: { x: 900, y: 100 },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'message-1' },
      { id: 'e2', source: 'message-1', target: 'router-1' },
      { id: 'e3', source: 'router-1', target: 'message-2' },
      { id: 'e4', source: 'router-1', target: 'message-3' },
      { id: 'e5', source: 'router-1', target: 'handoff-1' },
      { id: 'e6', source: 'message-2', target: 'end-1' },
      { id: 'e7', source: 'message-3', target: 'end-1' },
      { id: 'e8', source: 'handoff-1', target: 'end-1' },
    ],
  };

  // Create draft versions
  await prisma.botVersion.create({
    data: {
      botId: welcomeBot.id,
      version: 1,
      status: 'DRAFT',
      flowGraph: welcomeFlowGraph as any,
    },
  });

  await prisma.botVersion.create({
    data: {
      botId: customerSupportBot.id,
      version: 1,
      status: 'DRAFT',
      flowGraph: supportFlowGraph as any,
    },
  });

  // 5. Create Knowledge Base Collections
  console.log('Creating knowledge base...');
  const kbCollection = await prisma.knowledgeCollection.create({
    data: {
      tenantId: tenant1.id,
      botId: customerSupportBot.id,
      name: 'FAQ',
      description: 'Frequently asked questions',
    },
  });

  const kbSource = await prisma.knowledgeSource.create({
    data: {
      collectionId: kbCollection.id,
      type: 'qa',
      content: {
        pairs: [
          {
            question: 'What are your business hours?',
            answer: 'Our business hours are Monday to Friday, 9 AM to 6 PM EST.',
          },
          {
            question: 'How do I reset my password?',
            answer: 'You can reset your password by clicking "Forgot Password" on the login page.',
          },
          {
            question: 'What is your refund policy?',
            answer: 'We offer a 30-day money-back guarantee. Contact support for details.',
          },
          {
            question: 'How do I contact support?',
            answer:
              'You can contact support via email at support@example.com or use the chat feature.',
          },
        ],
      },
      metadata: {},
    },
  });

  // Process the source to create chunks
  const pairs = (kbSource.content as any).pairs || [];
  for (let i = 0; i < pairs.length; i++) {
    await prisma.knowledgeChunk.create({
      data: {
        sourceId: kbSource.id,
        content: `Q: ${pairs[i].question}\nA: ${pairs[i].answer}`,
        metadata: {
          type: 'qa',
          index: i,
        },
      },
    });
  }

  // 6. Create Tools
  console.log('Creating tools...');
  const apiTool = await prisma.tool.create({
    data: {
      tenantId: tenant1.id,
      name: 'Weather API',
      description: 'Get weather information for a location',
      config: {
        method: 'GET',
        url: 'https://api.weatherapi.com/v1/current.json',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
        retries: 3,
      },
      isActive: true,
    },
  });

  await prisma.toolSecret.create({
    data: {
      toolId: apiTool.id,
      key: 'apiKey',
      value: 'encrypted_value_here', // In real scenario, this would be encrypted
    },
  });

  // 7. Create Channel Connections
  console.log('Creating channel connections...');
  const webChannel = await prisma.channelConnection.create({
    data: {
      tenantId: tenant1.id,
      botId: customerSupportBot.id,
      channel: 'web',
      name: 'Web Channel',
      config: {
        publicUrl: 'http://localhost:3000',
      },
      isActive: true,
    },
  });

  // 8. Publish one bot version
  console.log('Publishing bot version...');
  await prisma.botVersion.create({
    data: {
      botId: welcomeBot.id,
      version: 2,
      status: 'PUBLISHED',
      flowGraph: welcomeFlowGraph as any,
    },
  });

  await prisma.bot.update({
    where: { id: welcomeBot.id },
    data: { publishedVersion: 2 },
  });

  console.log('✅ Seeding completed!');
  console.log('\n📋 Demo Credentials:');
  console.log('Tenant 1 (Acme Corporation):');
  console.log('  - Admin: admin@acme.com / password123');
  console.log('  - Builder: builder@acme.com / password123');
  console.log('  - Agent: agent@acme.com / password123');
  console.log('\nTenant 2 (Demo Company):');
  console.log('  - Admin: admin@demo.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
