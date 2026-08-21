import { Injectable, Logger } from "@nestjs/common";

export type LogDetails = Record<string, unknown>;

/**
 * Xuất một JSON object trên mỗi dòng stdout/stderr để log collector đọc.
 * Alert Telegram/Discord được cấu hình ở tầng monitoring, không gọi tại đây.
 */
@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger("User");

  info(event: string, details: LogDetails): void {
    this.logger.log(this.serialize(event, details));
  }

  warn(event: string, details: LogDetails): void {
    this.logger.warn(this.serialize(event, details));
  }

  error(event: string, details: LogDetails, stack?: string): void {
    this.logger.error(this.serialize(event, details), stack);
  }

  private serialize(event: string, details: LogDetails): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      service: "user",
      event,
      ...details,
    });
  }
}
