import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'proj-uuid-1111';

const mockProject = {
  id: PROJECT_ID,
  name: 'Test Project',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const mockPrismaService = {
  project: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);

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
    it('should return an array of projects', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([mockProject]);

      const result = await service.findAll();

      expect(mockPrismaService.project.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(PROJECT_ID);
    });

    it('should return an empty array when no projects exist', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(mockPrismaService.project.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(0);
    });

    it('should return all projects', async () => {
      const secondProject = {
        id: 'proj-uuid-2222',
        name: 'Second Project',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      mockPrismaService.project.findMany.mockResolvedValue([mockProject, secondProject]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(PROJECT_ID);
      expect(result[1].id).toBe('proj-uuid-2222');
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================

  describe('findOne', () => {
    it('should return a single project by id', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOne(PROJECT_ID);

      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: PROJECT_ID },
      });
      expect(result).toEqual(mockProject);
    });

    it('should return null for a non-existent id', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      const result = await service.findOne('non-existent-id');

      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
      expect(result).toBeNull();
    });

    it('should call prisma.project.findUnique with the correct where clause', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      await service.findOne(PROJECT_ID);

      expect(mockPrismaService.project.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: PROJECT_ID },
      });
    });
  });
});
