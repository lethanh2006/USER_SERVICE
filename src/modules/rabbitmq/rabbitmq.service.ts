import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as amqp from "amqplib";
import { SAFE_REQUEST_ID } from "../../common/middleware/request-id.middleware";
import { toError } from "../../common/utils/error.util";

export interface RabbitMessageMetadata {
  queueName: string;
  requestId?: string;
}

type MessageHandler = (
  content: unknown,
  metadata: RabbitMessageMetadata,
) => Promise<void> | void;

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shuttingDown = false;
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly subscriptions = new Map<string, MessageHandler>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureConnection().catch((exception: unknown) => {
      this.logger.warn(
        `Không thể kết nối RabbitMQ: ${toError(exception).message}`,
      );
      this.scheduleReconnect();
    });
  }

  isReady(): boolean {
    return this.connection !== null && this.channel !== null;
  }

  async subscribe(queueName: string, callback: MessageHandler): Promise<void> {
    this.subscriptions.set(queueName, callback);
    if (this.channel) await this.registerSubscription(queueName, callback);
  }

  async publish(
    queueName: string,
    message: unknown,
    requestId?: string,
  ): Promise<void> {
    await this.ensureConnection();
    const channel = this.channel;
    if (!channel) throw new Error("RabbitMQ channel is not initialized");

    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: "application/json",
      ...(requestId && SAFE_REQUEST_ID.test(requestId)
        ? { headers: { "x-request-id": requestId } }
        : {}),
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    const channel = this.channel;
    const connection = this.connection;
    this.channel = null;
    this.connection = null;
    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
  }

  private ensureConnection(): Promise<void> {
    if (this.channel) return Promise.resolve();
    if (!this.connectionPromise) {
      this.connectionPromise = this.connect().finally(() => {
        this.connectionPromise = null;
      });
    }
    return this.connectionPromise;
  }

  private async connect(): Promise<void> {
    if (this.channel || this.shuttingDown) return;

    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: this.configService.get<string>("Rabbitmq_Host") || "localhost",
      port: Number(
        this.configService.get<string>("RABBITMQ_AMQP_HOST_PORT") ||
          this.configService.get<string>("Rabbitmq_Port") ||
          5672,
      ),
      username:
        this.configService.get<string>("RABBITMQ_USER") ||
        this.configService.get<string>("Rabbitmq_Username") ||
        "guest",
      password:
        this.configService.get<string>("RABBITMQ_PASSWORD") ||
        this.configService.get<string>("Rabbitmq_Password") ||
        "guest",
    });
    if (this.shuttingDown) {
      await connection.close().catch(() => undefined);
      return;
    }

    const channel = await connection.createChannel();
    if (this.shuttingDown) {
      await channel.close().catch(() => undefined);
      await connection.close().catch(() => undefined);
      return;
    }

    this.connection = connection;
    this.channel = channel;

    connection.on("error", (error: Error) => {
      this.logger.warn(`RabbitMQ connection error: ${error.message}`);
    });
    connection.on("close", () => this.handleDisconnect(connection));
    channel.on("error", (error: Error) => {
      this.logger.warn(`RabbitMQ channel error: ${error.message}`);
    });
    channel.on("close", () => {
      this.handleChannelUnavailable(channel, "RabbitMQ channel closed");
    });

    try {
      for (const [queueName, callback] of this.subscriptions) {
        await this.registerSubscription(queueName, callback);
      }
    } catch (exception: unknown) {
      this.connection = null;
      this.channel = null;
      await channel.close().catch(() => undefined);
      await connection.close().catch(() => undefined);
      throw exception;
    }

    this.logger.log("Connected to RabbitMQ successfully");
  }

  private async registerSubscription(
    queueName: string,
    callback: MessageHandler,
  ): Promise<void> {
    const channel = this.channel;
    if (!channel) return;

    await channel.assertQueue(queueName, { durable: true });
    await channel.consume(queueName, (message) => {
      if (message) {
        void this.processMessage(queueName, message, callback, channel);
        return;
      }

      this.handleChannelUnavailable(
        channel,
        `RabbitMQ consumer '${queueName}' was cancelled by the broker`,
      );
    });
    this.logger.log(`Subscribed to RabbitMQ queue '${queueName}'`);
  }

  private async processMessage(
    queueName: string,
    message: amqp.ConsumeMessage,
    callback: MessageHandler,
    channel: amqp.Channel,
  ): Promise<void> {
    try {
      const content = JSON.parse(message.content.toString()) as unknown;
      const rawHeaders: unknown = message.properties.headers;
      const requestIdHeader = isRecord(rawHeaders)
        ? rawHeaders["x-request-id"]
        : undefined;
      const requestId =
        typeof requestIdHeader === "string" &&
        SAFE_REQUEST_ID.test(requestIdHeader)
          ? requestIdHeader
          : undefined;
      await callback(content, {
        queueName,
        ...(requestId ? { requestId } : {}),
      });
      channel.ack(message);
    } catch (exception: unknown) {
      const error = toError(exception);
      this.logger.error(
        `Error processing message from queue ${queueName}: ${error.message}`,
        error.stack,
      );
      try {
        channel.nack(message, false, false);
      } catch (nackException: unknown) {
        this.logger.warn(
          `Không thể nack RabbitMQ message: ${toError(nackException).message}`,
        );
      }
    }
  }

  private handleDisconnect(connection: amqp.ChannelModel): void {
    if (this.connection !== connection) return;
    this.connection = null;
    this.channel = null;
    if (this.shuttingDown) return;

    this.logger.warn("RabbitMQ connection closed. Reconnecting...");
    this.scheduleReconnect();
  }

  private handleChannelUnavailable(
    channel: amqp.Channel,
    reason: string,
  ): void {
    if (this.channel !== channel) return;

    const connection = this.connection;
    this.channel = null;
    this.connection = null;
    if (this.shuttingDown) return;

    this.logger.warn(`${reason}. Reconnecting...`);
    void connection?.close().catch(() => undefined);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.shuttingDown || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensureConnection().catch((exception: unknown) => {
        this.logger.warn(
          `Kết nối lại RabbitMQ thất bại: ${toError(exception).message}`,
        );
        this.scheduleReconnect();
      });
    }, 5_000);
    this.reconnectTimer.unref();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
