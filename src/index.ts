import express from 'express';
import dotenv from 'dotenv';
import connectDb from './config/db.js';
import userRoutes from './routes/user.js';
import { connectRabbitMQ, listenToQueue } from './config/rabbitmq.js';
import { handleProfileSync } from './controllers/user.js';
import cors from 'cors';
import { globalExceptionFilter } from './common/filters/global-exception.filter.js';
import { httpLoggingInterceptor } from './common/interceptors/http-logging.interceptor.js';
import { requestIdMiddleware } from './common/middleware/request-id.middleware.js';

dotenv.config();

connectDb();

await connectRabbitMQ();
await listenToQueue('user-profile-sync', handleProfileSync);



const app = express();
app.use(requestIdMiddleware);
app.use(httpLoggingInterceptor);
app.use(cors());

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user' });
});

app.use("/api/user", userRoutes);

app.use((_request, _response, next) => {
  const notFoundError = Object.assign(new Error('Not Found'), { status: 404 });
  next(notFoundError);
});
app.use(globalExceptionFilter);


const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`User service is running on port ${port}`);
});
