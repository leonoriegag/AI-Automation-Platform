import { describe, it, expect } from 'vitest';
import { hasPermission, Role } from '@nexora/domain';

describe('Role-Based Access Control (RBAC) Engine', () => {
  it('ORG_ADMIN should hold all permissions', () => {
    const role: Role = 'ORG_ADMIN';
    expect(hasPermission(role, 'workflow:read')).toBe(true);
    expect(hasPermission(role, 'workflow:write')).toBe(true);
    expect(hasPermission(role, 'workflow:delete')).toBe(true);
    expect(hasPermission(role, 'workflow:execute')).toBe(true);
    expect(hasPermission(role, 'credential:write')).toBe(true);
    expect(hasPermission(role, 'approval:decide')).toBe(true);
    expect(hasPermission(role, 'org:manage')).toBe(true);
  });

  it('WORKFLOW_EDITOR can write workflows but cannot manage credentials or delete org', () => {
    const role: Role = 'WORKFLOW_EDITOR';
    expect(hasPermission(role, 'workflow:read')).toBe(true);
    expect(hasPermission(role, 'workflow:write')).toBe(true);
    expect(hasPermission(role, 'credential:read')).toBe(true);
    expect(hasPermission(role, 'credential:write')).toBe(false);
    expect(hasPermission(role, 'approval:decide')).toBe(false);
    expect(hasPermission(role, 'org:manage')).toBe(false);
  });

  it('WORKFLOW_OPERATOR can execute but not modify workflows', () => {
    const role: Role = 'WORKFLOW_OPERATOR';
    expect(hasPermission(role, 'workflow:read')).toBe(true);
    expect(hasPermission(role, 'workflow:execute')).toBe(true);
    expect(hasPermission(role, 'workflow:write')).toBe(false);
    expect(hasPermission(role, 'workflow:delete')).toBe(false);
    expect(hasPermission(role, 'credential:write')).toBe(false);
  });

  it('APPROVER can decide approvals but cannot modify workflows', () => {
    const role: Role = 'APPROVER';
    expect(hasPermission(role, 'approval:decide')).toBe(true);
    expect(hasPermission(role, 'workflow:read')).toBe(true);
    expect(hasPermission(role, 'workflow:write')).toBe(false);
    expect(hasPermission(role, 'workflow:execute')).toBe(false);
  });

  it('VIEWER has strictly read-only access', () => {
    const role: Role = 'VIEWER';
    expect(hasPermission(role, 'workflow:read')).toBe(true);
    expect(hasPermission(role, 'workflow:write')).toBe(false);
    expect(hasPermission(role, 'workflow:execute')).toBe(false);
    expect(hasPermission(role, 'credential:read')).toBe(false);
    expect(hasPermission(role, 'approval:decide')).toBe(false);
  });
});
