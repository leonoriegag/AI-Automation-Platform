import { describe, it, expect } from 'vitest';
import { safeGet, interpolateExpression, resolveTemplateObject } from '@nexora/shared';

describe('Safe Expression Interpolator & Path Resolver', () => {
  const context = {
    trigger: {
      body: {
        customerEmail: 'USER@EXAMPLE.COM',
        amount: 250
      }
    },
    nodes: {
      lookup_crm: {
        output: {
          contactId: 'crm_cnt_100',
          company: 'Acme Corp',
          tags: ['enterprise', 'priority']
        }
      }
    }
  };

  it('should retrieve nested values with safeGet', () => {
    expect(safeGet(context, 'trigger.body.customerEmail')).toBe('USER@EXAMPLE.COM');
    expect(safeGet(context, 'nodes.lookup_crm.output.company')).toBe('Acme Corp');
    expect(safeGet(context, 'nodes.lookup_crm.output.tags.0')).toBe('enterprise');
    expect(safeGet(context, 'non.existent.path', 'fallback')).toBe('fallback');
  });

  it('should block prototype pollution attempts', () => {
    expect(safeGet(context, '__proto__.polluted', 'safe')).toBe('safe');
    expect(safeGet(context, 'constructor.prototype.polluted', 'safe')).toBe('safe');
  });

  it('should interpolate variables in string templates', () => {
    const template = 'Contact {{ nodes.lookup_crm.output.contactId }} from {{ nodes.lookup_crm.output.company }}';
    const result = interpolateExpression(template, context);
    expect(result).toBe('Contact crm_cnt_100 from Acme Corp');
  });

  it('should apply formatting filters', () => {
    const template = 'Email: {{ trigger.body.customerEmail | lower }}';
    const result = interpolateExpression(template, context);
    expect(result).toBe('Email: user@example.com');
  });

  it('should resolve template objects recursively preserving types', () => {
    const inputObj = {
      recipient: '{{ trigger.body.customerEmail | lower }}',
      total: '{{ trigger.body.amount }}', // Exact match returns raw number
      metadata: {
        externalId: '{{ nodes.lookup_crm.output.contactId }}',
        staticField: 42
      }
    };

    const resolved = resolveTemplateObject(inputObj, context);

    expect(resolved.recipient).toBe('user@example.com');
    expect(resolved.total).toBe(250); // Preserved raw number!
    expect(resolved.metadata.externalId).toBe('crm_cnt_100');
    expect(resolved.metadata.staticField).toBe(42);
  });
});
