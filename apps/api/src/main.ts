import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind Railway's proxy: rate limiting must key on the client IP, not the proxy's
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    app.set('trust proxy', 1);
  }

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
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
  const swaggerEnabled = process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Sealvo API')
      .setDescription('Sealvo — Vocabulary Learning Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
  if (swaggerEnabled) console.log(`📚 Swagger UI at http://localhost:${port}/api/docs`);
}
await bootstrap();
