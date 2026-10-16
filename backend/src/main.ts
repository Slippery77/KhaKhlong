import { NestFactory } from '@nestjs/core';
import { ValidationPipe} from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // security header พื้นฐาน — CSP, X-Frame-Options, HSTS
  app.use(helmet());

  // บีบ response — รายงานยอดขายย้อนหลังจะเล็กลงมาก
  app.use(compression());

  // ถ้า deploy หลัง nginx หรือ Cloudflare ต้องเปิด
  // ไม่งั้น req.ip ได้ IP ของ proxy แล้ว audit log กับ rate limit พัง
  app.set('trust proxy', 1);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,              // ตัด field ที่ไม่มีใน DTO ทิ้ง
    forbidNonWhitelisted: true,   // ส่ง field แปลกปลอมมา = 400 ไม่ใช่เงียบ ๆ ตัดทิ้ง
    transform: true,              // แปลง body เป็น instance ของ DTO class
    // ไม่เปิด enableImplicitConversion: มันแปลง "false" / "fault" เป็น true ด้วย Boolean() ก่อน validate
    // ถ้าต้องแปลง type จริง (เช่น query string เป็น number) ให้ใส่ @Type(() => Number) ที่ field นั้นแทน
  }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173').split(','),
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
  SwaggerModule.setup('api/docs',app ,SwaggerModule.createDocument(app,swaggerConfig));
  await app.listen(config.get<number>('PORT') ?? 3000);

  
}
bootstrap().catch((err) => {
  console.error(err);
});
