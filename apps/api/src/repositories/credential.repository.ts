import { PrismaClient } from '@prisma/client';
import { CreateCredentialInput, CredentialMetadata } from '@nexora/domain';
import { encrypt, decrypt, maskSecret, NotFoundError, ConflictError } from '@nexora/shared';

export class CredentialRepository {
  constructor(private prisma: PrismaClient) {}

  async list(organizationId: string): Promise<CredentialMetadata[]> {
    const creds = await this.prisma.credential.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });

    return creds.map(c => ({
      id: c.id,
      organizationId: c.organizationId,
      name: c.name,
      type: c.type as any,
      maskedHint: c.maskedHint,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));
  }

  async findById(organizationId: string, id: string): Promise<CredentialMetadata> {
    const cred = await this.prisma.credential.findFirst({
      where: { id, organizationId }
    });

    if (!cred) {
      throw new NotFoundError(`Credential with ID '${id}' not found`);
    }

    return {
      id: cred.id,
      organizationId: cred.organizationId,
      name: cred.name,
      type: cred.type as any,
      maskedHint: cred.maskedHint,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt
    };
  }

  async create(organizationId: string, input: CreateCredentialInput): Promise<CredentialMetadata> {
    const existing = await this.prisma.credential.findFirst({
      where: { organizationId, name: input.name }
    });

    if (existing) {
      throw new ConflictError(`Credential named '${input.name}' already exists in this organization`);
    }

    const encryptedSecret = encrypt(input.secret);
    const maskedHint = maskSecret(input.secret);

    const created = await this.prisma.credential.create({
      data: {
        organizationId,
        name: input.name,
        type: input.type as any,
        encryptedSecret,
        maskedHint
      }
    });

    return {
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      type: created.type as any,
      maskedHint: created.maskedHint,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };
  }

  async delete(organizationId: string, id: string): Promise<{ success: boolean }> {
    const cred = await this.prisma.credential.findFirst({
      where: { id, organizationId }
    });

    if (!cred) {
      throw new NotFoundError(`Credential with ID '${id}' not found`);
    }

    await this.prisma.credential.delete({
      where: { id }
    });

    return { success: true };
  }

  /**
   * Internal-only method: strictly for workflow runtime connector invocation
   * Never expose decrypted secret over HTTP endpoints!
   */
  async getDecryptedSecret(organizationId: string, id: string): Promise<string> {
    const cred = await this.prisma.credential.findFirst({
      where: { id, organizationId }
    });

    if (!cred) {
      throw new NotFoundError(`Credential with ID '${id}' not found`);
    }

    return decrypt(cred.encryptedSecret);
  }
}
