import express from 'express';
import dotenv from 'dotenv';
import { connect } from 'mongoose';
import connectDb from './config/db.js';
import { createClient } from 'redis';
import userRoutes from './routes/user.js';
import { connectRabbitMQ, listenToQueue } from './config/rabbitmq.js';
import { handleProfileSync } from './controllers/user.js';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

dotenv.config();

connectDb();

await connectRabbitMQ();
await listenToQueue('user-profile-sync', handleProfileSync);

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not defined');
}


export const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      console.log("Redis reconnect attempt:", retries);
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("connect", () => {
  console.log("Redis connecting...");
});

redisClient.on("ready", () => {
  console.log("Connected to Redis");
});

redisClient.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

redisClient.on("end", () => {
  console.warn("Redis connection closed");
});

redisClient.on("error", (err) => {
  console.error("Redis error (handled):", err.message);
});

await redisClient.connect();


const app = express();
app.use(cors());

app.use(express.json());
app.use("/api/user", userRoutes);

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'User Service API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});


const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`User service is running on port ${port}`);
});
