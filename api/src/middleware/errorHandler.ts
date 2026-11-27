import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { errors as joseErrors } from 'jose';
import { ZodError } from 'zod';
import { env } from '../config/env';
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors/AppError';
import { ErrorCode } from '../errors/errorCodes';
import { formatZodErrors } from './validate';

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.map(String) : [];

    if (target.includes('email')) {
      return new ConflictError(
        'An account with this email already exists',
        ErrorCode.EMAIL_ALREADY_EXISTS,
        { email: ['An account with this email already exists'] },
      );
    }
    if (target.includes('username')) {
      return new ConflictError(
        'That username is already taken',
        ErrorCode.USERNAME_TAKEN,
        { username: ['That username is already taken'] },
      );
    }

    return new ConflictError('A record with those values already exists');
  }

  if (err.code === 'P2025') {
    return new NotFoundError('Requested record was not found');
  }

  if (err.code === 'P2003') {
    return new BadRequestError('Invalid reference provided');
  }

  return new AppError({
    statusCode: 500,
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    message: 'Database operation failed',
    isOperational: false,
    cause: err,
  });
}

function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof ZodError) {
    return new ValidationError(formatZodErrors(err));
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return mapPrismaError(err);
  }

  if (err instanceof joseErrors.JWTExpired) {
    return new UnauthorizedError('Your session has expired', ErrorCode.TOKEN_EXPIRED);
  }

  if (err instanceof joseErrors.JOSEError) {
    return new UnauthorizedError('Invalid authentication token', ErrorCode.INVALID_TOKEN);
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return new BadRequestError('Malformed JSON request body');
  }

  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err instanceof Error
        ? err.message
        : 'Unknown error';

  return new AppError({
    statusCode: 500,
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    message,
    isOperational: false,
    cause: err,
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError = normalizeError(err);

  if (!appError.isOperational || appError.statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.fields ? { fields: appError.fields } : {}),
      ...(appError.details ? { details: appError.details } : {}),
      ...(env.NODE_ENV !== 'production' && !appError.isOperational && err instanceof Error
        ? { stack: err.stack }
        : {}),
    },
  });
}
