import { z } from 'zod';

export const RoleEnum = z.enum([
  'ORG_ADMIN',
  'WORKFLOW_EDITOR',
  'WORKFLOW_OPERATOR',
  'APPROVER',
  'VIEWER'
]);

export type Role = z.infer<typeof RoleEnum>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: RoleEnum,
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type User = z.infer<typeof UserSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const RegisterUserInputSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
  role: RoleEnum.default('VIEWER')
});

export type RegisterUserInput = z.infer<typeof RegisterUserInputSchema>;

export type Permission =
  | 'workflow:read'
  | 'workflow:write'
  | 'workflow:delete'
  | 'workflow:execute'
  | 'credential:read'
  | 'credential:write'
  | 'credential:delete'
  | 'approval:decide'
  | 'audit:read'
  | 'org:manage';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ORG_ADMIN: [
    'workflow:read',
    'workflow:write',
    'workflow:delete',
    'workflow:execute',
    'credential:read',
    'credential:write',
    'credential:delete',
    'approval:decide',
    'audit:read',
    'org:manage'
  ],
  WORKFLOW_EDITOR: [
    'workflow:read',
    'workflow:write',
    'workflow:execute',
    'credential:read',
    'audit:read'
  ],
  WORKFLOW_OPERATOR: [
    'workflow:read',
    'workflow:execute',
    'audit:read'
  ],
  APPROVER: [
    'workflow:read',
    'approval:decide',
    'audit:read'
  ],
  VIEWER: [
    'workflow:read'
  ]
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
