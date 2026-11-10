import { PrismaClient, Role, CredentialType, WorkflowStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { encrypt, maskSecret } from '../../packages/shared/src/crypto/encryption.js';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for NEXORA Operations...');

  // 1. Create Organizations
  const nexoraOrg = await prisma.organization.upsert({
    where: { slug: 'nexora-operations' },
    update: {},
    create: {
      name: 'NEXORA Operations',
      slug: 'nexora-operations'
    }
  });

  const competitorOrg = await prisma.organization.upsert({
    where: { slug: 'competitor-corp' },
    update: {},
    create: {
      name: 'Competitor Corp',
      slug: 'competitor-corp'
    }
  });

  console.log(`✅ Organizations ready: ${nexoraOrg.name} (${nexoraOrg.id}), ${competitorOrg.name}`);

  // 2. Create Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const usersData = [
    { email: 'admin@nexora.io', name: 'NEXORA Admin', role: Role.ORG_ADMIN, organizationId: nexoraOrg.id },
    { email: 'editor@nexora.io', name: 'Lead Workflow Editor', role: Role.WORKFLOW_EDITOR, organizationId: nexoraOrg.id },
    { email: 'operator@nexora.io', name: 'Platform Operator', role: Role.WORKFLOW_OPERATOR, organizationId: nexoraOrg.id },
    { email: 'approver@nexora.io', name: 'Business Approver', role: Role.APPROVER, organizationId: nexoraOrg.id },
    { email: 'viewer@nexora.io', name: 'Auditor Viewer', role: Role.VIEWER, organizationId: nexoraOrg.id },
    { email: 'admin@competitor.io', name: 'Competitor Admin', role: Role.ORG_ADMIN, organizationId: competitorOrg.id }
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId: u.organizationId,
          email: u.email
        }
      },
      update: { role: u.role, passwordHash },
      create: {
        organizationId: u.organizationId,
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash
      }
    });
  }

  console.log('✅ Standard users and roles seeded');

  // 3. Create Encrypted Credentials
  const rawApiKey = 'nexora_live_sk_9481948194819481';
  const credSecretEncrypted = encrypt(rawApiKey);
  const credMasked = maskSecret(rawApiKey);

  await prisma.credential.upsert({
    where: {
      organizationId_name: {
        organizationId: nexoraOrg.id,
        name: 'CRM Production API Key'
      }
    },
    update: {},
    create: {
      organizationId: nexoraOrg.id,
      name: 'CRM Production API Key',
      type: CredentialType.API_KEY,
      encryptedSecret: credSecretEncrypted,
      maskedHint: credMasked
    }
  });

  console.log('✅ Encrypted credentials seeded (AES-256-GCM)');

  // 4. Create Baseline Seed Workflow
  const sampleGraph = {
    nodes: [
      {
        id: 'node_manual_trigger',
        type: 'trigger:manual',
        name: 'Manual Order Trigger',
        config: {},
        position: { x: 100, y: 100 }
      },
      {
        id: 'node_notify_email',
        type: 'action:email',
        name: 'Send Confirmation Email',
        config: {
          to: 'customer@example.com',
          subject: 'Order Processed Confirmation',
          bodyHtml: '<p>Your order has been queued successfully.</p>'
        },
        position: { x: 400, y: 100 }
      }
    ],
    edges: [
      {
        id: 'edge_start_to_notify',
        source: 'node_manual_trigger',
        target: 'node_notify_email',
        sourceHandle: 'default',
        targetHandle: 'default'
      }
    ]
  };

  const existingWf = await prisma.workflow.findFirst({
    where: { organizationId: nexoraOrg.id, name: 'Sample Order Notification Workflow' }
  });

  if (!existingWf) {
    const wf = await prisma.workflow.create({
      data: {
        organizationId: nexoraOrg.id,
        name: 'Sample Order Notification Workflow',
        description: 'Baseline template workflow demonstrating DAG execution and notification routing.',
        status: WorkflowStatus.ACTIVE,
        currentVersion: 1
      }
    });

    await prisma.workflowVersion.create({
      data: {
        workflowId: wf.id,
        version: 1,
        graph: sampleGraph as any,
        changelog: 'Seed baseline version'
      }
    });
    console.log(`✅ Baseline workflow created (${wf.id})`);
  }

  // 5. Seed Mock CRM Records
  const contact = await prisma.crmContact.upsert({
    where: {
      organizationId_email: {
        organizationId: nexoraOrg.id,
        email: 'alice.smith@acme.corp'
      }
    },
    update: {},
    create: {
      organizationId: nexoraOrg.id,
      email: 'alice.smith@acme.corp',
      firstName: 'Alice',
      lastName: 'Smith',
      company: 'Acme Corporation',
      phone: '+1-555-0199'
    }
  });

  await prisma.crmLead.create({
    data: {
      organizationId: nexoraOrg.id,
      contactId: contact.id,
      title: 'Acme Global Expansion Project',
      status: 'QUALIFIED',
      score: 85,
      estimatedValue: 75000,
      assignedTo: 'Sarah Connor'
    }
  });

  console.log('✅ Mock CRM contacts and leads seeded');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
