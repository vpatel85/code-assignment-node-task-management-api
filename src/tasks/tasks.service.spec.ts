import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { TaskStatus, TaskPriority } from '@prisma/client';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const TASK_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PROJECT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ASSIGNEE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const OTHER_ASSIGNEE_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const TAG_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const mockAssignee = {
  id: ASSIGNEE_ID,
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockProject = {
  id: PROJECT_ID,
  name: 'Project Alpha',
  description: 'Alpha project',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockTag = { id: TAG_ID, name: 'urgent' };

/** A minimal "raw" task row (no relations) returned by task.findMany */
const mockRawTask = {
  id: TASK_ID,
  title: 'Test Task',
  description: 'A task for tests',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  dueDate: new Date('2024-06-15'),
  projectId: PROJECT_ID,
  assigneeId: ASSIGNEE_ID,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/** A task with relations attached (returned by findOne / create / update) */
const mockTaskWithRelations = {
  ...mockRawTask,
  assignee: mockAssignee,
  project: mockProject,
  tags: [mockTag],
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
  sendEmail: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe('findAll', () => {
    /** Set up the three relation queries that findAll calls per task */
    function setupRelationMocks(rawTask = mockRawTask) {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAssignee);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.tag.findMany.mockResolvedValue([mockTag]);
      mockPrismaService.task.findMany.mockResolvedValue([rawTask]);
    }

    it('findAll with no filters returns all tasks with relations', async () => {
      setupRelationMocks();

      const result = await service.findAll({} as TaskFilterDto);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: TASK_ID,
        title: 'Test Task',
        assignee: mockAssignee,
        project: mockProject,
        tags: [mockTag],
      });
    });

    it('findAll with status filter returns only matching tasks', async () => {
      // Two tasks: one TODO, one IN_PROGRESS
      const inProgressTask = {
        ...mockRawTask,
        id: 'ffff0000-0000-0000-0000-000000000000',
        status: TaskStatus.IN_PROGRESS,
      };
      mockPrismaService.task.findMany.mockResolvedValue([mockRawTask, inProgressTask]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAssignee);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const filterDto: TaskFilterDto = { status: TaskStatus.IN_PROGRESS };
      const result = await service.findAll(filterDto);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('findAll with priority filter returns only matching tasks', async () => {
      const highTask = {
        ...mockRawTask,
        id: 'ffff1111-0000-0000-0000-000000000000',
        priority: TaskPriority.HIGH,
      };
      mockPrismaService.task.findMany.mockResolvedValue([mockRawTask, highTask]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAssignee);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const filterDto: TaskFilterDto = { priority: TaskPriority.HIGH };
      const result = await service.findAll(filterDto);

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe(TaskPriority.HIGH);
    });

    it('findAll with assigneeId filter returns only tasks for that assignee', async () => {
      const otherTask = {
        ...mockRawTask,
        id: 'ffff2222-0000-0000-0000-000000000000',
        assigneeId: OTHER_ASSIGNEE_ID,
      };
      mockPrismaService.task.findMany.mockResolvedValue([mockRawTask, otherTask]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAssignee);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const filterDto: TaskFilterDto = { assigneeId: ASSIGNEE_ID };
      const result = await service.findAll(filterDto);

      expect(result).toHaveLength(1);
      expect(result[0].assigneeId).toBe(ASSIGNEE_ID);
    });

    it('findAll with projectId filter returns only tasks in that project', async () => {
      const OTHER_PROJECT_ID = 'ffffffff-1111-1111-1111-ffffffffffff';
      const otherProjectTask = {
        ...mockRawTask,
        id: 'ffff3333-0000-0000-0000-000000000000',
        projectId: OTHER_PROJECT_ID,
      };
      mockPrismaService.task.findMany.mockResolvedValue([mockRawTask, otherProjectTask]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAssignee);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const filterDto: TaskFilterDto = { projectId: PROJECT_ID };
      const result = await service.findAll(filterDto);

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe(PROJECT_ID);
    });

    it('findAll with dueDateFrom filter excludes tasks before the date', async () => {
      const oldTask = {
        ...mockRawTask,
        id: 'ffff4444-0000-0000-0000-000000000000',
        dueDate: new Date('2024-01-01'),
      };
      // mockRawTask has dueDate 2024-06-15 — should pass; oldTask should be excluded
      mockPrismaService.task.findMany.mockResolvedValue([mockRawTask, oldTask]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAssignee);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const filterDto: TaskFilterDto = { dueDateFrom: '2024-03-01' };
      const result = await service.findAll(filterDto);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TASK_ID);
    });

    it('findAll with dueDateTo filter excludes tasks after the date', async () => {
      const futureTask = {
        ...mockRawTask,
        id: 'ffff5555-0000-0000-0000-000000000000',
        dueDate: new Date('2025-01-01'),
      };
      mockPrismaService.task.findMany.mockResolvedValue([mockRawTask, futureTask]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAssignee);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const filterDto: TaskFilterDto = { dueDateTo: '2024-12-31' };
      const result = await service.findAll(filterDto);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TASK_ID);
    });

    it('findAll with combined filters applies all conditions together', async () => {
      const mismatchTask = {
        ...mockRawTask,
        id: 'ffff6666-0000-0000-0000-000000000000',
        status: TaskStatus.DONE,
        priority: TaskPriority.LOW,
      };
      mockPrismaService.task.findMany.mockResolvedValue([mockRawTask, mismatchTask]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAssignee);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const filterDto: TaskFilterDto = {
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        assigneeId: ASSIGNEE_ID,
        projectId: PROJECT_ID,
        dueDateFrom: '2024-01-01',
        dueDateTo: '2024-12-31',
      };
      const result = await service.findAll(filterDto);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TASK_ID);
    });

    it('findAll with dueDateFrom/To excludes tasks with null dueDate', async () => {
      const nullDueDateTask = {
        ...mockRawTask,
        id: 'ffff7777-0000-0000-0000-000000000000',
        dueDate: null,
      };
      mockPrismaService.task.findMany.mockResolvedValue([nullDueDateTask]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAssignee);
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const filterDto: TaskFilterDto = { dueDateFrom: '2024-01-01' };
      const result = await service.findAll(filterDto);

      expect(result).toHaveLength(0);
    });

    it('findAll sets assignee to null when task has no assigneeId', async () => {
      const unassignedTask = { ...mockRawTask, assigneeId: null };
      mockPrismaService.task.findMany.mockResolvedValue([unassignedTask]);
      // user.findUnique should NOT be called for unassigned tasks
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const result = await service.findAll({} as TaskFilterDto);

      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      expect(result[0].assignee).toBeNull();
    });

    it('findAll returns empty array when no tasks exist', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);

      const result = await service.findAll({} as TaskFilterDto);

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------

  describe('findOne', () => {
    it('findOne returns the task when it exists', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTaskWithRelations);

      const result = await service.findOne(TASK_ID);

      expect(mockPrismaService.task.findUnique).toHaveBeenCalledWith({
        where: { id: TASK_ID },
        include: { assignee: true, project: true, tags: true },
      });
      expect(result).toEqual(mockTaskWithRelations);
    });

    it('findOne throws NotFoundException when task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne(TASK_ID)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(TASK_ID)).rejects.toThrow(
        `Task with ID ${TASK_ID} not found`,
      );
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe('create', () => {
    it('create task successfully and sends assignment email when assignee exists', async () => {
      mockPrismaService.task.create.mockResolvedValue(mockTaskWithRelations);
      mockEmailService.sendTaskAssignmentNotification.mockResolvedValue(undefined);

      const createDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'A task for tests',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: '2024-06-15T00:00:00.000Z',
        projectId: PROJECT_ID,
        assigneeId: ASSIGNEE_ID,
      };

      const result = await service.create(createDto);

      expect(mockPrismaService.task.create).toHaveBeenCalledWith({
        data: {
          title: createDto.title,
          description: createDto.description,
          status: createDto.status,
          priority: createDto.priority,
          dueDate: createDto.dueDate,
          project: { connect: { id: PROJECT_ID } },
          assignee: { connect: { id: ASSIGNEE_ID } },
          tags: undefined,
        },
        include: { assignee: true, project: true, tags: true },
      });
      expect(mockEmailService.sendTaskAssignmentNotification).toHaveBeenCalledWith(
        mockAssignee.email,
        mockTaskWithRelations.title,
      );
      expect(result).toEqual(mockTaskWithRelations);
    });

    it('create task without assignee does not send email', async () => {
      const taskWithoutAssignee = { ...mockTaskWithRelations, assignee: null, assigneeId: null };
      mockPrismaService.task.create.mockResolvedValue(taskWithoutAssignee);

      const createDto: CreateTaskDto = {
        title: 'Unassigned Task',
        projectId: PROJECT_ID,
      };

      const result = await service.create(createDto);

      expect(mockEmailService.sendTaskAssignmentNotification).not.toHaveBeenCalled();
      expect(result).toEqual(taskWithoutAssignee);
    });

    it('create task with all optional fields passes correct data to Prisma', async () => {
      const tagIds = [TAG_ID];
      const taskWithTags = { ...mockTaskWithRelations, tags: [mockTag] };
      mockPrismaService.task.create.mockResolvedValue(taskWithTags);
      mockEmailService.sendTaskAssignmentNotification.mockResolvedValue(undefined);

      const createDto: CreateTaskDto = {
        title: 'Full Task',
        description: 'Full description',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: '2024-12-31T23:59:59.000Z',
        projectId: PROJECT_ID,
        assigneeId: ASSIGNEE_ID,
        tagIds,
      };

      await service.create(createDto);

      expect(mockPrismaService.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tags: { connect: [{ id: TAG_ID }] },
          assignee: { connect: { id: ASSIGNEE_ID } },
        }),
        include: { assignee: true, project: true, tags: true },
      });
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe('update', () => {
    it('update existing task returns updated task', async () => {
      // findOne (used internally) needs findUnique
      mockPrismaService.task.findUnique.mockResolvedValue(mockTaskWithRelations);
      const updatedTask = {
        ...mockTaskWithRelations,
        title: 'Updated Title',
        assignee: mockAssignee,
        // same assigneeId — no email expected
      };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const updateDto: UpdateTaskDto = { title: 'Updated Title' };
      const result = await service.update(TASK_ID, updateDto);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: TASK_ID },
        data: expect.objectContaining({ title: 'Updated Title' }),
        include: { assignee: true, project: true, tags: true },
      });
      expect(result).toEqual(updatedTask);
    });

    it('update task status change does not trigger email (email only fires on assignee change)', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTaskWithRelations);
      const updatedTask = { ...mockTaskWithRelations, status: TaskStatus.DONE };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const updateDto: UpdateTaskDto = { status: TaskStatus.DONE };
      await service.update(TASK_ID, updateDto);

      // updateDto.assigneeId is undefined → no email
      expect(mockEmailService.sendTaskAssignmentNotification).not.toHaveBeenCalled();
    });

    it('update task with new assigneeId sends assignment email', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTaskWithRelations);
      const newAssignee = { ...mockAssignee, id: OTHER_ASSIGNEE_ID, email: 'bob@example.com' };
      const updatedTask = { ...mockTaskWithRelations, assigneeId: OTHER_ASSIGNEE_ID, assignee: newAssignee };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);
      mockEmailService.sendTaskAssignmentNotification.mockResolvedValue(undefined);

      const updateDto: UpdateTaskDto = { assigneeId: OTHER_ASSIGNEE_ID };
      await service.update(TASK_ID, updateDto);

      expect(mockEmailService.sendTaskAssignmentNotification).toHaveBeenCalledWith(
        newAssignee.email,
        updatedTask.title,
      );
    });

    it('update task with same assigneeId does not send duplicate email', async () => {
      // existingTask and updatedTask share the same assigneeId
      mockPrismaService.task.findUnique.mockResolvedValue(mockTaskWithRelations);
      mockPrismaService.task.update.mockResolvedValue(mockTaskWithRelations);

      const updateDto: UpdateTaskDto = { assigneeId: ASSIGNEE_ID };
      await service.update(TASK_ID, updateDto);

      // assigneeId unchanged → no email
      expect(mockEmailService.sendTaskAssignmentNotification).not.toHaveBeenCalled();
    });

    it('update disconnects assignee when assigneeId is null', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTaskWithRelations);
      const unassignedTask = { ...mockTaskWithRelations, assignee: null, assigneeId: null };
      mockPrismaService.task.update.mockResolvedValue(unassignedTask);

      const updateDto: UpdateTaskDto = { assigneeId: null };
      await service.update(TASK_ID, updateDto);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignee: { disconnect: true },
          }),
        }),
      );
      // null assigneeId — condition `updateTaskDto.assigneeId && ...` is falsy
      expect(mockEmailService.sendTaskAssignmentNotification).not.toHaveBeenCalled();
    });

    it('update with tagIds uses set semantics', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTaskWithRelations);
      mockPrismaService.task.update.mockResolvedValue(mockTaskWithRelations);

      const updateDto: UpdateTaskDto = { tagIds: [TAG_ID] };
      await service.update(TASK_ID, updateDto);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: { set: [{ id: TAG_ID }] },
          }),
        }),
      );
    });

    it('update non-existing task throws NotFoundException', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      const updateDto: UpdateTaskDto = { title: 'Ghost' };
      await expect(service.update(TASK_ID, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    it('remove existing task calls delete and returns success message', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTaskWithRelations);
      mockPrismaService.task.delete.mockResolvedValue(mockTaskWithRelations);

      const result = await service.remove(TASK_ID);

      expect(mockPrismaService.task.delete).toHaveBeenCalledWith({
        where: { id: TASK_ID },
      });
      expect(result).toEqual({ message: 'Task deleted successfully' });
    });

    it('remove non-existing task throws NotFoundException', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.remove(TASK_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.task.delete).not.toHaveBeenCalled();
    });
  });
});
