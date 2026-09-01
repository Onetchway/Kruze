import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { CorrelationIdMiddleware } from "./common/correlation-id.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(",") ?? true,
    credentials: true,
  });
  app.use(new CorrelationIdMiddleware().use);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix("v1");
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
