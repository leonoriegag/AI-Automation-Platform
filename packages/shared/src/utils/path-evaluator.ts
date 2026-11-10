/**
 * Safely retrieves a nested property value using dot-notation path
 * Prevents prototype pollution and arbitrary execution.
 */
export function safeGet(obj: any, path: string, defaultValue: any = undefined): any {
  if (obj === null || obj === undefined || !path) {
    return defaultValue;
  }

  // Sanitize path against prototype pollution
  if (path.includes('__proto__') || path.includes('constructor') || path.includes('prototype')) {
    return defaultValue;
  }

  // Normalize array notation `foo[0].bar` -> `foo.0.bar`
  const normalizedPath = path.replace(/\[(\w+)\]/g, '.$1');
  const segments = normalizedPath.split('.').filter(Boolean);

  let current = obj;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[segment];
  }

  return current !== undefined ? current : defaultValue;
}

/**
 * Safely evaluates template expressions: {{ nodes.node1.output.id }} or {{ trigger.body.email }}
 * Supports simple filters: {{ nodes.node1.output.email | lower }}
 */
export function interpolateExpression(template: string, context: Record<string, any>): string {
  if (typeof template !== 'string') return template;

  const EXPRESSION_REGEX = /\{\{\s*([\w\.\_]+)(?:\s*\|\s*(\w+))?\s*\}\}/g;

  return template.replace(EXPRESSION_REGEX, (_, path, filter) => {
    let value = safeGet(context, path, '');

    if (filter && typeof value === 'string') {
      switch (filter.toLowerCase()) {
        case 'lower':
          value = value.toLowerCase();
          break;
        case 'upper':
          value = value.toUpperCase();
          break;
        case 'trim':
          value = value.trim();
          break;
      }
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return value !== undefined ? String(value) : '';
  });
}

/**
 * Recursively resolves all expressions inside an object or array
 */
export function resolveTemplateObject<T = any>(obj: T, context: Record<string, any>): T {
  if (typeof obj === 'string') {
    // If the entire string is just `{{ path }}`, return the raw typed value instead of converting to string
    const exactMatch = obj.trim().match(/^\{\{\s*([\w\.\_]+)\s*\}\}$/);
    if (exactMatch) {
      return safeGet(context, exactMatch[1], undefined);
    }
    return interpolateExpression(obj, context) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveTemplateObject(item, context)) as unknown as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveTemplateObject(value, context);
    }
    return result as T;
  }

  return obj;
}
