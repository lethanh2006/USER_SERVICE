import '@nrapp/observability/register';

import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PinoNestLogger, shutdownTelemetry } from '@nrapp/observability';
import { AppModule } from './app.module';
import { appLogger } from './common/observability/app-logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new PinoNestLogger(appLogger, 'NestApplication'),
  });

  app.enableShutdownHooks();
  app.enableCors({
    origin: '*',
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const port = process.env.PORT || 5000;
  await app.listen(port);
  appLogger.info(
    {
      'event.name': 'service.started',
      'server.port': Number(port),
    },
    'User service đã khởi động',
  );
}

void bootstrap().catch(async (exception: unknown) => {
  const error =
    exception instanceof Error ? exception : new Error(String(exception));
  appLogger.fatal(
    {
      'event.name': 'service.bootstrap.failed',
      error,
    },
    'Không thể khởi động dịch vụ người dùng',
  );
  appLogger.flush();
  await shutdownTelemetry(3_000);
  process.exitCode = 1;
});
