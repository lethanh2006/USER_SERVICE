import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { toError } from "./common/utils/error.util";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.enableCors({
    origin: "*",
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
  new Logger("Bootstrap").log(
    `User Service NestJS is running on: http://localhost:${port}`,
  );
}

void bootstrap().catch((exception: unknown) => {
  const error = toError(exception);
  new Logger("Bootstrap").error(
    `Không thể khởi động dịch vụ người dùng: ${error.message}`,
    error.stack,
  );
  process.exitCode = 1;
});
