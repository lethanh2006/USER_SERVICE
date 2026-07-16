export declare const connectRabbitMQ: () => Promise<void>;
export declare const publishToQueue: (queueName: string, message: unknown) => Promise<void>;
export declare const listenToQueue: (queueName: string, callback: (message: any) => Promise<void>) => Promise<void>;
//# sourceMappingURL=rabbitmq.d.ts.map