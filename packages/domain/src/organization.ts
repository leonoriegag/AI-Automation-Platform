import { z } from 'zod';

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationSchema = OrganizationSchema.pick({
  name: true,
  slug: true
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
