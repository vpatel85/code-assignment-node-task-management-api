import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'proj-uuid-1111';
const USER_ID = 'user-uuid-1111';
const TASK_ID = 'task-uuid-1111';

const mockUser = {
  id: USER_ID,
  email: 'alice@example.com',
  name: 'Alice',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockProject = {
  id: PROJECT_ID,
  name: 'Test Project',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockTag = {
  id: 'tag-uuid-1111',
  name: 'bug',
  createdAt: new Date('2024-01-01'),
};

const mockTask = {
  id: TASK_ID,
  title: 'Test Task',
  description: 'A description',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  dueDate: null,
  projectId: PROJECT_ID,
  assigneeId: USER_ID,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  assignee: mockUser,
  project: mockProject,
  tags: [],
};

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const mockPrismaService = {
  task: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
  },
  tag: {
    findMany: jest.fn(),
  },
};

const mockEmailService = {
  sendTaskAssignmentNotification: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Sanity check
  // -------------------------------------------------------------------------

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // findAll
  // =========================================================================

  describe('findAll', () => {
    it('should return paginated envelope with tasks (no filter)', async () => {
      const tasksWithRelations = [{ ...mockTask }];
      mockPrismaService.task.findMany.mockResolvedValue(tasksWithRelations);
      mockPrismaService.task.count.mockResolvedValue(1);

      const result = await service.findAll({} as TaskFilterDto);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          include: { assignee: true, project: true, tags: true },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
      expect(mockPrismaService.task.findMany).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(TASK_ID);
    });

    it('should pass status filter in where clause', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([{ ...mockTask }]);
      mockPrismaService.task.count.mockResolvedValue(1);

      const filter: TaskFilterDto = { status: TaskStatus.TODO };
      await service.findAll(filter);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: TaskStatus.TODO }),
        }),
      );
    });

    it('should pass priority filter in where clause', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([{ ...mockTask }]);
      mockPrismaService.task.count.mockResolvedValue(1);

      const filter: TaskFilterDto = { priority: TaskPriority.MEDIUM };
      await service.findAll(filter);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ priority: TaskPriority.MEDIUM }),
        }),
      );
    });

    it('should pass assigneeId filter in where clause', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([{ ...mockTask }]);
      mockPrismaService.task.count.mockResolvedValue(1);

      const filter: TaskFilterDto = { assigneeId: USER_ID };
      await service.findAll(filter);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assigneeId: USER_ID }),
        }),
      );
    });

    it('should pass projectId filter in where clause', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([{ ...mockTask }]);
      mockPrismaService.task.count.mockResolvedValue(1);

      const filter: TaskFilterDto = { projectId: PROJECT_ID };
      await service.findAll(filter);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: PROJECT_ID }),
        }),
      );
    });

    it('should pass dueDateFrom as gte filter in where clause', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.task.count.mockResolvedValue(0);

      const filter: TaskFilterDto = { dueDateFrom: '2050-01-01' };
      await service.findAll(filter);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.objectContaining({ gte: new Date('2050-01-01') }),
          }),
        }),
      );
    });

    it('should pass dueDateTo as lte filter in where clause', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.task.count.mockResolvedValue(0);

      const filter: TaskFilterDto = { dueDateTo: '2050-01-01' };
      await service.findAll(filter);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.objectContaining({ lte: new Date('2050-01-01') }),
          }),
        }),
      );
    });

    it('should pass both dueDateFrom and dueDateTo in dueDate where clause', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.task.count.mockResolvedValue(0);

      const filter: TaskFilterDto = { dueDateFrom: '2024-01-01', dueDateTo: '2024-12-31' };
      await service.findAll(filter);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-12-31'),
            },
          }),
        }),
      );
    });

    it('should apply all filters simultaneously in a single where clause', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([{ ...mockTask }]);
      mockPrismaService.task.count.mockResolvedValue(1);

      const filter: TaskFilterDto = {
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        assigneeId: USER_ID,
        projectId: PROJECT_ID,
        dueDateFrom: '2024-01-01',
        dueDateTo: '2024-12-31',
      };
      await service.findAll(filter);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: TaskStatus.TODO,
            priority: TaskPriority.HIGH,
            assigneeId: USER_ID,
            projectId: PROJECT_ID,
            dueDate: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-12-31'),
            },
          },
          include: { assignee: true, project: true, tags: true },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return empty data array when no tasks exist', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.task.count.mockResolvedValue(0);

      const result = await service.findAll({} as TaskFilterDto);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return tasks with embedded relations (assignee, project, tags)', async () => {
      const taskWithRelations = {
        ...mockTask,
        assignee: mockUser,
        project: mockProject,
        tags: [mockTag],
      };
      mockPrismaService.task.findMany.mockResolvedValue([taskWithRelations]);
      mockPrismaService.task.count.mockResolvedValue(1);

      const result = await service.findAll({} as TaskFilterDto);

      expect(result.data[0].assignee).toEqual(mockUser);
      expect(result.data[0].project).toEqual(mockProject);
      expect(result.data[0].tags).toHaveLength(1);
    });

    it('should never call user.findUnique, project.findUnique, or tag.findMany separately', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([{ ...mockTask, assigneeId: null, assignee: null }]);
      mockPrismaService.task.count.mockResolvedValue(1);

      await service.findAll({} as TaskFilterDto);

      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.project.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.tag.findMany).not.toHaveBeenCalled();
    });

    it('should filter tasks by COMPLETED status via where clause', async () => {
      const completedTask = { ...mockTask, id: 'task-uuid-done', status: TaskStatus.COMPLETED };
      mockPrismaService.task.findMany.mockResolvedValue([completedTask]);
      mockPrismaService.task.count.mockResolvedValue(1);

      const filter: TaskFilterDto = { status: TaskStatus.COMPLETED };
      const result = await service.findAll(filter);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: TaskStatus.COMPLETED }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(TaskStatus.COMPLETED);
    });

    // -----------------------------------------------------------------------
    // pagination
    // -----------------------------------------------------------------------

    describe('pagination', () => {
      it('should apply default pagination when no parameters provided', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([{ ...mockTask }]);
        mockPrismaService.task.count.mockResolvedValue(1);

        const result = await service.findAll({} as TaskFilterDto);

        expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 0, take: 20 }),
        );
        expect(result).toEqual(
          expect.objectContaining({ data: expect.any(Array), total: 1, page: 1, limit: 20 }),
        );
      });

      it('should apply custom page and limit values', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([{ ...mockTask }]);
        mockPrismaService.task.count.mockResolvedValue(15);

        const result = await service.findAll({ page: 2, limit: 10 } as TaskFilterDto);

        expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 10, take: 10 }),
        );
        expect(result.page).toBe(2);
        expect(result.limit).toBe(10);
      });

      it('should cap limit at 100', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([{ ...mockTask }]);
        mockPrismaService.task.count.mockResolvedValue(200);

        const result = await service.findAll({ limit: 150 } as TaskFilterDto);

        expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 100 }),
        );
        expect(result.limit).toBe(100);
      });

      it('should return correct total and data structure', async () => {
        const task2 = { ...mockTask, id: 'task-uuid-2222' };
        mockPrismaService.task.findMany.mockResolvedValue([{ ...mockTask }, task2]);
        mockPrismaService.task.count.mockResolvedValue(25);

        const result = await service.findAll({} as TaskFilterDto);

        expect(result.total).toBe(25);
        expect(result.data).toHaveLength(2);
        expect(result.data[0].id).toBe(TASK_ID);
        expect(result.data[1].id).toBe('task-uuid-2222');
      });

      it('should compute skip correctly for page 3 with limit 5', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([]);
        mockPrismaService.task.count.mockResolvedValue(20);

        await service.findAll({ page: 3, limit: 5 } as TaskFilterDto);

        // skip = (3 - 1) * 5 = 10
        expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 10, take: 5 }),
        );
      });

      it('should pass the same where clause to both findMany and count', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([]);
        mockPrismaService.task.count.mockResolvedValue(0);

        const filter: TaskFilterDto = { status: TaskStatus.TODO, projectId: PROJECT_ID };
        await service.findAll(filter);

        const expectedWhere = { status: TaskStatus.TODO, projectId: PROJECT_ID };
        expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: expectedWhere }),
        );
        expect(mockPrismaService.task.count).toHaveBeenCalledWith({ where: expectedWhere });
      });
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================

  describe('findOne', () => {
    it('should return a task by id', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.findOne(TASK_ID);

      expect(mockPrismaService.task.findUnique).toHaveBeenCalledWith({
        where: { id: TASK_ID },
        include: { assignee: true, project: true, tags: true },
      });
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Task with ID non-existent-id not found',
      );
    });
  });

  // =========================================================================
  // create
  // =========================================================================

  describe('create', () => {
    const createDto: CreateTaskDto = {
      title: 'New Task',
      description: 'Task description',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      projectId: PROJECT_ID,
      assigneeId: USER_ID,
    };

    it('should create a task and return it', async () => {
      mockPrismaService.task.create.mockResolvedValue(mockTask);

      const result = await service.create(createDto);

      expect(mockPrismaService.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: createDto.title,
            description: createDto.description,
            status: createDto.status,
            priority: createDto.priority,
          }),
          include: { assignee: true, project: true, tags: true },
        }),
      );
      expect(result).toEqual(mockTask);
    });

    it('should send an email notification when task has an assignee', async () => {
      mockPrismaService.task.create.mockResolvedValue(mockTask);

      await service.create(createDto);

      expect(mockEmailService.sendTaskAssignmentNotification).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendTaskAssignmentNotification).toHaveBeenCalledWith(
        mockUser.email,
        mockTask.title,
      );
    });

    it('should NOT send an email notification when task has no assignee', async () => {
      const taskWithoutAssignee = { ...mockTask, assigneeId: null, assignee: null };
      mockPrismaService.task.create.mockResolvedValue(taskWithoutAssignee);

      const dtoWithoutAssignee: CreateTaskDto = { ...createDto, assigneeId: undefined };
      await service.create(dtoWithoutAssignee);

      expect(mockEmailService.sendTaskAssignmentNotification).not.toHaveBeenCalled();
    });

    it('should create a task with COMPLETED status', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      mockPrismaService.task.create.mockResolvedValue(completedTask);

      const dtoCompleted: CreateTaskDto = {
        ...createDto,
        status: TaskStatus.COMPLETED,
      };
      const result = await service.create(dtoCompleted);

      expect(result.status).toBe(TaskStatus.COMPLETED);
    });

    it('should create a task with URGENT priority', async () => {
      const urgentTask = { ...mockTask, priority: TaskPriority.URGENT };
      mockPrismaService.task.create.mockResolvedValue(urgentTask);

      const dtoUrgent: CreateTaskDto = {
        ...createDto,
        priority: TaskPriority.URGENT,
      };
      const result = await service.create(dtoUrgent);

      expect(result.priority).toBe(TaskPriority.URGENT);
    });

    it('should create a task with tags', async () => {
      const taskWithTags = { ...mockTask, tags: [mockTag] };
      mockPrismaService.task.create.mockResolvedValue(taskWithTags);

      const dtoWithTags: CreateTaskDto = { ...createDto, tagIds: [mockTag.id] };
      const result = await service.create(dtoWithTags);

      expect(mockPrismaService.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: { connect: [{ id: mockTag.id }] },
          }),
        }),
      );
      expect(result.tags).toHaveLength(1);
    });

    it('should create a task without tagIds (undefined)', async () => {
      const taskNoTags = { ...mockTask, tags: [] };
      mockPrismaService.task.create.mockResolvedValue(taskNoTags);

      const dtoNoTags: CreateTaskDto = { ...createDto, tagIds: undefined };
      await service.create(dtoNoTags);

      expect(mockPrismaService.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: undefined,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // update
  // =========================================================================

  describe('update', () => {
    const updateDto: UpdateTaskDto = {
      title: 'Updated Task',
      status: TaskStatus.IN_PROGRESS,
    };

    it('should update a task and return the updated task', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Task', status: TaskStatus.IN_PROGRESS };
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const result = await service.update(TASK_ID, updateDto);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TASK_ID },
          include: { assignee: true, project: true, tags: true },
        }),
      );
      expect(result.title).toBe('Updated Task');
      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should throw NotFoundException when updating a non-existent task', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should send email notification when assigneeId changes to a new user', async () => {
      const NEW_USER_ID = 'user-uuid-new';
      const newUser = { ...mockUser, id: NEW_USER_ID, email: 'bob@example.com' };
      const updatedTask = { ...mockTask, assigneeId: NEW_USER_ID, assignee: newUser };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask); // existing has USER_ID
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const dtoNewAssignee: UpdateTaskDto = { assigneeId: NEW_USER_ID };
      await service.update(TASK_ID, dtoNewAssignee);

      expect(mockEmailService.sendTaskAssignmentNotification).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendTaskAssignmentNotification).toHaveBeenCalledWith(
        newUser.email,
        updatedTask.title,
      );
    });

    it('should NOT send email notification when assigneeId is unchanged', async () => {
      const updatedTask = { ...mockTask };
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      // Same assigneeId as the existing task
      const dtoSameAssignee: UpdateTaskDto = { assigneeId: USER_ID };
      await service.update(TASK_ID, dtoSameAssignee);

      expect(mockEmailService.sendTaskAssignmentNotification).not.toHaveBeenCalled();
    });

    it('should NOT send email notification when assigneeId is not provided in update', async () => {
      const updatedTask = { ...mockTask, title: 'New Title' };
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const dtoNoAssignee: UpdateTaskDto = { title: 'New Title' };
      await service.update(TASK_ID, dtoNoAssignee);

      expect(mockEmailService.sendTaskAssignmentNotification).not.toHaveBeenCalled();
    });

    it('should update task status to COMPLETED', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(completedTask);

      const dtoCompleted: UpdateTaskDto = { status: TaskStatus.COMPLETED };
      const result = await service.update(TASK_ID, dtoCompleted);

      expect(result.status).toBe(TaskStatus.COMPLETED);
    });

    it('should update task status to CANCELLED', async () => {
      const cancelledTask = { ...mockTask, status: TaskStatus.CANCELLED };
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(cancelledTask);

      const dtoCancelled: UpdateTaskDto = { status: TaskStatus.CANCELLED };
      const result = await service.update(TASK_ID, dtoCancelled);

      expect(result.status).toBe(TaskStatus.CANCELLED);
    });

    it('should unassign a task when assigneeId is null', async () => {
      const unassignedTask = { ...mockTask, assigneeId: null, assignee: null };
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(unassignedTask);

      const dtoUnassign: UpdateTaskDto = { assigneeId: null };
      const result = await service.update(TASK_ID, dtoUnassign);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignee: { disconnect: true },
          }),
        }),
      );
      expect(result.assigneeId).toBeNull();
    });

    it('should update tags using set operation', async () => {
      const newTagId = 'tag-uuid-new';
      const taskWithNewTags = { ...mockTask, tags: [{ ...mockTag, id: newTagId }] };
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue(taskWithNewTags);

      const dtoNewTags: UpdateTaskDto = { tagIds: [newTagId] };
      await service.update(TASK_ID, dtoNewTags);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: { set: [{ id: newTagId }] },
          }),
        }),
      );
    });
  });

  // =========================================================================
  // remove
  // =========================================================================

  describe('remove', () => {
    it('should delete a task and return success message', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.delete.mockResolvedValue(mockTask);

      const result = await service.remove(TASK_ID);

      expect(mockPrismaService.task.delete).toHaveBeenCalledWith({
        where: { id: TASK_ID },
      });
      expect(result).toEqual({ message: 'Task deleted successfully' });
    });

    it('should throw NotFoundException when deleting a non-existent task', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should call findOne before deleting', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.delete.mockResolvedValue(mockTask);

      await service.remove(TASK_ID);

      expect(mockPrismaService.task.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: TASK_ID } }),
      );
      expect(mockPrismaService.task.delete).toHaveBeenCalledTimes(1);
    });
  });
});
