import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody é necessário para a validação de assinatura do webhook do Mercado Pago.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Servir uploads (imagens do chat) estaticamente. Os arquivos vão para
  // ${UPLOAD_DIR}/chat e ficam acessíveis em /api/uploads/chat/<filename>.
  const uploadRoot = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  try {
    mkdirSync(join(uploadRoot, 'chat'), { recursive: true });
  } catch {
    // ignore
  }
  app.useStaticAssets(uploadRoot, {
    prefix: '/api/uploads/',
    maxAge: '7d',
  });

  const PORT = process.env.PORT || 3001;
  await app.listen(PORT);
  console.log(`Backend rodando na porta ${PORT}`);
}

bootstrap();
