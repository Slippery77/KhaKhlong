import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'fs';
import { extname, join, resolve } from 'path';
import type { Request, Response, NextFunction } from 'express';

function resolveFrontendDistPath(): string | null {
  const candidates = [
    join(__dirname, '..', '..', 'frontend', 'dist'),
    resolve(process.cwd(), 'frontend', 'dist'),
    resolve(process.cwd(), '..', 'frontend', 'dist'),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.html'))) {
      return dir;
    }
  }
  return null;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // รองรับ JSON payload ขนาดสูงสุด 2MB (เช่น รูปเมนูอาหารที่ย่อขนาดเป็น Data URL)
  app.useBodyParser('json', { limit: '2mb' });

  // security header พื้นฐาน — CSP รองรับ PWA, Google Fonts (Kanit) และรูปเมนู/สลิปแบบ Data URL / Blob
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: [
            "'self'",
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
          ],
          workerSrc: ["'self'", 'blob:'],
          manifestSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // บีบ response — รายงานยอดขายย้อนหลังจะเล็กลงมาก
  app.use(compression());

  // ถ้า deploy หลัง nginx หรือ Cloudflare ต้องเปิด
  // ไม่งั้น req.ip ได้ IP ของ proxy แล้ว audit log กับ rate limit พัง
  app.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ตัด field ที่ไม่มีใน DTO ทิ้ง
      forbidNonWhitelisted: true, // ส่ง field แปลกปลอมมา = 400 ไม่ใช่เงียบ ๆ ตัดทิ้ง
      transform: true, // แปลง body เป็น instance ของ DTO class
      // ไม่เปิด enableImplicitConversion: มันแปลง "false" / "fault" เป็น true ด้วย Boolean() ก่อน validate
      // ถ้าต้องแปลง type จริง (เช่น query string เป็น number) ให้ใส่ @Type(() => Number) ที่ field นั้นแทน
    }),
  );
  app.setGlobalPrefix('api');

  const allowedOrigins = (
    config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // อนุญาต request จาก origin เดียวกัน (ไม่มี header Origin), origin ใน .env,
      // เครื่องในวง LAN เดียวกัน และลิงก์ HTTPS จาก Cloudflare Tunnel
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i.test(
          origin,
        )
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });
  app.enableShutdownHooks(); // ปิด connection pool ให้เรียบร้อยตอน restart

  // Swagger อธิบาย API สำหรับ dev/test
  const swaggerConfig = new DocumentBuilder() // สร้าง config ของ swagger
    .setTitle('PWA-POS API')
    .setDescription('API documentation for PWA-POS')
    .setVersion('0.1')
    .addBearerAuth() // ต้องมี jwt ถึงจะเรียก API ได้
    .build(); // ปิดการทำงาน และสร้าง document ของ swagger
  // argument ตัวที่ 1 คือ path /api/doc/ , argument ตัวที่ 2 คือ path ของ swagger, argument ตัวที่ 3 คือ document ที่สร้างจาก config
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  // เสิร์ฟหน้าเว็บ Production (frontend/dist) จากพอร์ตเดียวกับ Backend
  const frontendDist = resolveFrontendDistPath();
  if (frontendDist) {
    app.useStaticAssets(frontendDist, {
      index: false,
      setHeaders: (res: Response, filePath: string) => {
        if (
          filePath.endsWith('sw.js') ||
          filePath.endsWith('manifest.webmanifest') ||
          filePath.endsWith('index.html')
        ) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    });

    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use((req: Request, res: Response, next: NextFunction) => {
      if (
        req.method !== 'GET' ||
        req.path.startsWith('/api') ||
        extname(req.path) !== ''
      ) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(join(frontendDist, 'index.html'));
    });
  }

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap().catch((err) => {
  console.error(err);
});
