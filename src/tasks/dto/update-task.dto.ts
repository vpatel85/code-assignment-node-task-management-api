import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'Updated title of the task',
    example: 'Implement login page (revised)',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the task',
    example: 'Revised scope: add MFA support to the login flow',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated status of the task',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Updated priority level of the task',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Updated due date in ISO 8601 format',
    example: '2024-11-30T17:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'UUID of the new assignee, or null to unassign',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional({
    description: 'Replacement array of tag UUIDs for the task',
    type: [String],
    example: ['c3d4e5f6-a7b8-9012-cdef-123456789012'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}
