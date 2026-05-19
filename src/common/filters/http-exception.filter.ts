import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let body: { error: string; details?: { field: string; constraints: string[] }[] };

    if (
      exception instanceof BadRequestException &&
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'details' in exceptionResponse
    ) {
      // Validation errors produced by our custom exceptionFactory
      const resp = exceptionResponse as {
        error: string;
        details: { field: string; constraints: string[] }[];
      };
      body = {
        error: resp.error ?? 'Bad Request',
        details: resp.details,
      };
    } else if (
      exception instanceof BadRequestException &&
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as { message: unknown }).message)
    ) {
      // Default NestJS class-validator array of message strings
      const messages = (exceptionResponse as { message: string[] }).message;
      body = {
        error: 'Validation failed',
        details: messages.map((msg) => ({ field: '', constraints: [msg] })),
      };
    } else {
      body = { error: exception.message };
    }

    response.status(status).json(body);
  }
}
