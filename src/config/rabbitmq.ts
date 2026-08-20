import amql from 'amqplib'
import { SAFE_REQUEST_ID } from '../common/middleware/request-id.middleware.js';

let channel: amql.Channel;

export interface RabbitMessageMetadata {
    queueName: string;
    requestId?: string;
}

export const connectRabbitMQ = async() => {
    try {
        const connection = await amql.connect({
            protocol: 'amqp',
            hostname:  process.env.Rabbitmq_Host,
            port: 5672,
            username: process.env.Rabbitmq_Username,
            password: process.env.Rabbitmq_Password,
        });
        channel = await connection.createChannel();
        console.log('Connected to RabbitMQ successfully');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        throw error;
    }
}

export const publishToQueue = async(
    queueName: string,
    message: unknown,
    requestId?: string,
) => {
    if (!channel) {
        throw new Error('RabbitMQ channel is not initialized. Call connectRabbitMQ first.');
    }
    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        ...(requestId && SAFE_REQUEST_ID.test(requestId)
            ? { headers: { 'x-request-id': requestId } }
            : {}),
    });
}

export const listenToQueue = async (
    queueName: string,
    callback: (message: any, metadata: RabbitMessageMetadata) => Promise<void>,
) => {
    if (!channel) {
        throw new Error('RabbitMQ channel is not initialized. Call connectRabbitMQ first.');
    }
    await channel.assertQueue(queueName, { durable: true });
    channel.consume(queueName, async (msg) => {
        if (msg) {
            try {
                const content = JSON.parse(msg.content.toString());
                const requestIdHeader = msg.properties.headers?.['x-request-id'];
                const requestId =
                    typeof requestIdHeader === 'string' && SAFE_REQUEST_ID.test(requestIdHeader)
                        ? requestIdHeader
                        : undefined;
                await callback(content, {
                    queueName,
                    ...(requestId ? { requestId } : {}),
                });
                channel.ack(msg);
            } catch (error) {
                console.error(`Error processing message from queue ${queueName}:`, error);
                // Reject the message and do not requeue it to avoid infinite loops on malformed messages
                channel.nack(msg, false, false);
            }
        }
    });
};