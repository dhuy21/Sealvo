import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { appConfig, type AppConfig } from './config/app.config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
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
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

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
