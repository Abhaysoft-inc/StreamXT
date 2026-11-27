import { ErrorCode, type ErrorCodeType } from './errorCodes';

export type FieldErrors = Record<string, string[]>;

export interface AppErrorOptions {
  statusCode: number;
  code: ErrorCodeType;
  message: string;
  fields?: FieldErrors;
  details?: Record<string, unknown>;
  isOperational?: boolean;
  cause?: unknown;
}

/**
 * Base operational error class serialized by the global error middleware.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCodeType;
  public readonly fields?: FieldErrors;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = new.target.name;
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.fields = options.fields;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    Error.captureStackTrace(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(
    message = 'Bad request',
    code: ErrorCodeType = ErrorCode.BAD_REQUEST,
    details?: Record<string, unknown>,
    fields?: FieldErrors,
  ) {
    super({ statusCode: 400, code, message, details, fields });
  }
}

export class ValidationError extends AppError {
  constructor(
    fields: FieldErrors,
    message = 'Validation failed. Please check the highlighted fields.',
  ) {
    super({
      statusCode: 422,
      code: ErrorCode.VALIDATION_ERROR,
      message,
      fields,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = 'Authentication required',
    code: ErrorCodeType = ErrorCode.UNAUTHORIZED,
    details?: Record<string, unknown>,
    fields?: FieldErrors,
  ) {
    super({ statusCode: 401, code, message, details, fields });
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = 'You do not have permission to perform this action',
    code: ErrorCodeType = ErrorCode.FORBIDDEN,
    details?: Record<string, unknown>,
  ) {
    super({ statusCode: 403, code, message, details });
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = 'Resource not found',
    code: ErrorCodeType = ErrorCode.NOT_FOUND,
  ) {
    super({ statusCode: 404, code, message });
  }
}

export class ConflictError extends AppError {
  constructor(
    message = 'Resource already exists',
    code: ErrorCodeType = ErrorCode.CONFLICT,
    fields?: FieldErrors,
  ) {
    super({ statusCode: 409, code, message, fields });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message = 'Too many requests. Please try again later.',
    code: ErrorCodeType = ErrorCode.RATE_LIMITED,
    details?: Record<string, unknown>,
  ) {
    super({ statusCode: 429, code, message, details });
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    message = 'Upstream service error',
    code: ErrorCodeType = ErrorCode.OAUTH_PROVIDER_ERROR,
    cause?: unknown,
  ) {
    super({ statusCode: 502, code, message, cause });
  }
}
