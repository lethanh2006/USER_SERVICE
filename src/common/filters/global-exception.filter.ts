import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { RequestWithContext } from "../interfaces/request-context.interface";
import { StructuredLoggerService } from "../observability/structured-logger.service";
import { toError } from "../utils/error.util";

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: StructuredLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<RequestWithContext>();
    const requestContext = request.requestContext;
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const error = toError(exception);
    const details = {
      requestId: requestContext?.requestId ?? "unknown",
      ...(request.user?._id ? { userId: request.user._id } : {}),
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode,
      durationMs: requestContext
        ? Number(process.hrtime.bigint() - requestContext.startedAt) / 1e6
        : 0,
      errorName: error.name,
      message: error.message,
    };

    if (statusCode >= 500) {
      this.logger.error("http_request_failed", details, error.stack);
    } else {
      this.logger.warn("http_request_rejected", details);
    }

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const legacyMessageResponse =
      exceptionResponse !== null &&
      typeof exceptionResponse === "object" &&
      !Array.isArray(exceptionResponse) &&
      Object.keys(exceptionResponse).length === 1 &&
      typeof (exceptionResponse as Record<string, unknown>).message ===
        "string";
    const responseBody = legacyMessageResponse
      ? exceptionResponse
      : exceptionResponse !== null &&
          typeof exceptionResponse === "object" &&
          !Array.isArray(exceptionResponse)
        ? {
            ...(exceptionResponse as Record<string, unknown>),
            requestId: requestContext?.requestId ?? "unknown",
          }
        : {
            statusCode,
            message:
              statusCode >= 500
                ? "Internal server error"
                : (exceptionResponse ?? error.message),
            requestId: requestContext?.requestId ?? "unknown",
          };

    httpAdapter.reply(httpContext.getResponse(), responseBody, statusCode);
  }
}
