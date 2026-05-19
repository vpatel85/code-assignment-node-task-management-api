import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'user-uuid-1111';

const mockUser = {
  id: USER_ID,
  email: 'alice@example.com',
  name: 'Alice',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const mockPrismaService = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

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
    it('should return an array of users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(USER_ID);
    });

    it('should return an empty array when no users exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(0);
    });

    it('should return all users', async () => {
      const secondUser = {
        id: 'user-uuid-2222',
        email: 'bob@example.com',
        name: 'Bob',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      mockPrismaService.user.findMany.mockResolvedValue([mockUser, secondUser]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(USER_ID);
      expect(result[1].id).toBe('user-uuid-2222');
    });
  });

  // =========================================================================
  // findOne
  // =========================================================================

  describe('findOne', () => {
    it('should return a single user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(USER_ID);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: USER_ID },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null for a non-existent id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findOne('non-existent-id');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
      expect(result).toBeNull();
    });

    it('should call prisma.user.findUnique with the correct where clause', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.findOne(USER_ID);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: USER_ID },
      });
    });
  });
});
