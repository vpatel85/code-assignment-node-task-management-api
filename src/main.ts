import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

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
