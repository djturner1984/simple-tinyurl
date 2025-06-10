import Redis from 'ioredis';
import { RedisCache } from '../cache/redisCache';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the Redis client
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  }));
});

describe('RedisCache', () => {
  let cache: RedisCache;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a mock Redis client
    mockRedis = new Redis() as jest.Mocked<Redis>;

    // Create cache instance
    cache = new RedisCache(mockRedis);
  });

  describe('get', () => {
    it('should return cached value when found', async () => {
      const key = 'test-key';
      const value = 'test-value';
      mockRedis.get.mockResolvedValueOnce(value);

      const result = await cache.get(key);

      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(result).toBe(value);
    });

    it('should return null when key not found', async () => {
      const key = 'nonexistent';
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await cache.get(key);

      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(result).toBeNull();
    });

    it('should handle Redis errors', async () => {
      const key = 'test-key';
      const error = new Error('Redis error');
      mockRedis.get.mockRejectedValueOnce(error);

      await expect(cache.get(key)).rejects.toThrow('Redis error');
    });
  });

  describe('set', () => {
    it('should set a value in the cache', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cache.set(key, value);

      expect(mockRedis.set).toHaveBeenCalledWith(key, value);
    });

    it('should handle Redis errors', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const error = new Error('Redis error');
      mockRedis.set.mockRejectedValueOnce(error);

      await expect(cache.set(key, value)).rejects.toThrow('Redis error');
    });
  });
}); 