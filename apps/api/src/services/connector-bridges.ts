import type { PrismaClient } from '@prisma/client';
import { CrmLeadStatus } from '@prisma/client';
import {
  setEmailOutboxClient,
  setCrmStorageClient,
  ConnectorRegistry,
} from '@nexora/connectors';

export function initializeConnectorBridges(prisma: PrismaClient) {
  // Ensure default connectors (HTTP, Webhook, Email, Slack, CRM) are registered
  ConnectorRegistry.getInstance();

  // 1. Email Outbox Bridge
  setEmailOutboxClient({
    async recordSentEmail(entry) {
      const created = await prisma.mockEmailOutbox.create({
        data: {
          organizationId: entry.organizationId,
          to: entry.to,
          from: entry.from,
          subject: entry.subject,
          bodyHtml: entry.html || entry.body,
        },
      });
      return { id: created.id };
    },
  });

  // 2. CRM Bridge
  setCrmStorageClient({
    async findContact(orgId: string, email: string) {
      return prisma.crmContact.findFirst({
        where: { organizationId: orgId, email },
        include: { leads: true },
      });
    },

    async createContact(orgId: string, contact) {
      return prisma.crmContact.create({
        data: {
          organizationId: orgId,
          email: contact.email,
          firstName: contact.firstName || 'Unknown',
          lastName: contact.lastName || 'Contact',
          company: contact.company,
          phone: contact.phone,
        },
      });
    },

    async createLead(orgId: string, lead) {
      return prisma.crmLead.create({
        data: {
          organizationId: orgId,
          title: lead.title || `Lead for ${lead.email}`,
          metadata: lead.company ? { company: lead.company } : {},
          status: (lead.status as CrmLeadStatus) || CrmLeadStatus.NEW,
          score: lead.score || 0,
          contactId: lead.contactId,
        },
      });
    },

    async updateLead(orgId: string, leadId: string, patch) {
      return prisma.crmLead.update({
        where: { id: leadId, organizationId: orgId },
        data: {
          ...(patch.status ? { status: patch.status as CrmLeadStatus } : {}),
          ...(patch.score !== undefined ? { score: patch.score } : {}),
        },
      });
    },

    async addActivity(orgId: string, activity) {
      return prisma.crmActivity.create({
        data: {
          organizationId: orgId,
          entityType: activity.contactId ? 'contact' : 'lead',
          entityId: (activity.contactId || activity.leadId) as string,
          type: activity.type || 'NOTE',
          content: activity.subject,
        },
      });
    },
  });
}
