import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
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

  // Docs describe the deployed API surface; never expose them in production,
  // where each tenant's request-shape/error-detail is otherwise not public.
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Kruze API")
      .setDescription(
        "Enterprise Employee Mobility & Fleet Operating System. " +
          "Every endpoint requires a Bearer JWT from POST /v1/auth/login except " +
          "the signup/claim-account endpoints, which are intentionally public.",
      )
      .setVersion("1.0")
      .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "access-token")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    // Nest's swagger plugin infers request/response shapes from the existing
    // class-validator DTOs automatically, but doesn't know which endpoints
    // are guarded — default every operation to bearer auth (accurate for
    // all but the handful of explicitly public signup/claim/login routes,
    // which is a reasonable default to override per-route later rather
    // than hand-annotating all ~150 endpoints up front).
    for (const path of Object.values(document.paths)) {
      for (const operation of Object.values(path as Record<string, { security?: unknown }>)) {
        operation.security ??= [{ "access-token": [] }];
      }
    }
    SwaggerModule.setup("v1/docs", app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
