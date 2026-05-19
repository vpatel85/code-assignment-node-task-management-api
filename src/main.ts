import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new BadRequestException({
      error: 'Validation failed',
      details: errors.map((e) => ({
        field: e.property,
        constraints: Object.values(e.constraints ?? {}),
      })),
    }),
  }));

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Task Management API')
    .setDescription(
      'REST API for task management supporting CRUD operations on tasks, projects, and users. ' +
      'Tasks support filtering by status, priority, assignee, project, and due date.',
    )
    .setVersion('1.0')
    .addTag('Tasks', 'Create, read, update, and delete tasks')
    .addTag('Projects', 'Read available projects')
    .addTag('Users', 'Read registered users')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
