import { PrismaClient, AuditAction } from '@prisma/client';

export class AuditRepository {
  constructor(private prisma: PrismaClient) {}

  async record(data: {
    organizationId: string;
    userId?: string;
    action: AuditAction;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        metadata: data.metadata ?? {},
        ipAddress: data.ipAddress
      }
    });
  }

  async list(organizationId: string, options: { action?: AuditAction; limit?: number; offset?: number } = {}) {
    const where: any = { organizationId };
    if (options.action) where.action = options.action;

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
        include: {
          user: {
            select: { name: true, email: true, role: true }
          }
        }
      })
    ]);

    return { total, items };
  }
}
