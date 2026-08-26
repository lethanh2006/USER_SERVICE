import { createAppLogger, PinoNestLogger } from '@nrapp/observability';

export const appLogger: ReturnType<typeof createAppLogger> = createAppLogger({
  serviceName: 'user',
});

export const nestLogger = new PinoNestLogger(appLogger, 'User');
