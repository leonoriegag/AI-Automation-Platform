export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied: insufficient permissions', details?: unknown) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class SSRFError extends AppError {
  constructor(message: string = 'Target address violates security policy (SSRF protection)', details?: unknown) {
    super(message, 400, 'SSRF_VIOLATION', details);
  }
}

export class ExecutionBudgetExceededError extends AppError {
  constructor(message: string = 'Execution budget exceeded (max iterations or timeout)', details?: unknown) {
    super(message, 429, 'BUDGET_EXCEEDED', details);
  }
}
