import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { appConfig, type AppConfig } from './config/app.config.js';
import { VALIDATION_PIPE_OPTIONS } from './common/validation/validation-messages.js';

/** POST words takes up to 500 words; at the longest allowed fields that is about 5.5 MB */
const ADD_WORDS_BODY_LIMIT = '6mb';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Only this route gets the large limit; every other JSON body keeps Nest's default parser (100 KB),
  // which skips a body already parsed here
  app
    .getHttpAdapter()
    .getInstance()
    .post('/packages/:packageId/words', json({ limit: ADD_WORDS_BODY_LIMIT }));
  app.enableShutdownHooks();
  const config = app.get<AppConfig>(appConfig.KEY);

  // Behind Railway's proxy: rate limiting must key on the client IP, not the proxy's
  if (config.isDeployed) {
    app.set('trust proxy', 1);
  }

  // Default CSP already fits Swagger UI: its init script is a same-origin file, inline styles are allowed
  app.use(helmet());
  app.enableCors({
    origin: config.frontendUrl,
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));

  // Swagger / OpenAPI
  // Off in staging too: it is publicly reachable
  const swaggerEnabled = !config.isDeployed;
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Sealvo API')
      .setDescription('Sealvo — Vocabulary Learning Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const { port } = config;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
  if (swaggerEnabled) console.log(`📚 Swagger UI at http://localhost:${port}/api/docs`);
}
await bootstrap();
