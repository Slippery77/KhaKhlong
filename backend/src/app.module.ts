import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RegistersModule } from './modules/register/register.module';
import { MenuModule } from './modules/menu/menu.module';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TablesModule } from './modules/tables/tables.module';
import { FloorsModule } from './modules/floors/floors.module';
import { KdsModule } from './modules/kds/kds.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import * as Joi from 'joi';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        DB_SSL: Joi.boolean().default(false),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('1d'),
        REFRESH_EXPIRES_HOURS: Joi.number().integer().min(1).max(72).default(16),
        CORS_ORIGIN: Joi.string().required(),
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RegistersModule,
    MenuModule,
    TablesModule,
    FloorsModule,
    KdsModule,
    OrdersModule,
    ShiftsModule,
    SystemConfigModule,
    InventoryModule,
    PaymentModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor, },
  ],
})
export class AppModule { }
