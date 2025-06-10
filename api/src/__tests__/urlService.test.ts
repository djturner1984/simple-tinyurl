import { UrlService } from '../services/urlService';
import { IUrlRepository } from '../types';
import { ICache } from '../types';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock implementations
class MockUrlRepository implements IUrlRepository {
  private urls: Map<string, { shortUrl: string; originalUrl: string; createdAt: string }> = new Map();

  async saveUrl(record: { shortUrl: string; originalUrl: string; createdAt: string }): Promise<void> {
    this.urls.set(record.shortUrl, record);
  }

  async getUrl(shortUrl: string): Promise<{ shortUrl: string; originalUrl: string; createdAt: string } | null> {
    return this.urls.get(shortUrl) || null;
  }
}

class MockCache implements ICache {
  private cache: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.cache.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.cache.set(key, value);
  }
}

describe('UrlService', () => {
  let urlService: UrlService;
  let mockRepository: MockUrlRepository;
  let mockCache: MockCache;
  const baseUrl = 'http://localhost:3001';

  beforeEach(() => {
    mockRepository = new MockUrlRepository();
    mockCache = new MockCache();
    urlService = new UrlService(mockRepository, mockCache, baseUrl);
  });

  describe('createShortUrl', () => {
    it('should create a short URL and save it to the repository', async () => {
      const originalUrl = 'https://example.com';
      const shortUrl = await urlService.createShortUrl(originalUrl);

      // Verify the short URL format
      expect(shortUrl).toMatch(new RegExp(`^${baseUrl}/[a-z0-9]{6}$`));

      // Extract the short code from the full URL
      const shortCode = shortUrl.split('/').pop()!;

      // Verify the URL was saved in the repository
      const savedUrl = await mockRepository.getUrl(shortCode);
      expect(savedUrl).toBeDefined();
      expect(savedUrl?.originalUrl).toBe(originalUrl);
    });

    it('should generate unique short URLs no more than 6 characters', async () => {
      const url = await urlService.createShortUrl('https://someurl.com');
      
      expect(url).toMatch(new RegExp(`^${baseUrl}/[a-z0-9]{6}$`));
    });

    it('should generate unique short URLs for different original URLs', async () => {
      const url1 = await urlService.createShortUrl('https://example1.com');
      const url2 = await urlService.createShortUrl('https://example2.com');
      expect(url1).not.toBe(url2);
    });
  });

  describe('getOriginalUrl', () => {
    it('should return the original URL from cache if available', async () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      await mockCache.set(shortCode, JSON.stringify({ originalUrl }));

      const result = await urlService.getOriginalUrl(shortCode);
      expect(result).toBe(originalUrl);
    });

    it('should fetch from repository and cache if not in cache', async () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      const createdAt = new Date().toISOString();

      await mockRepository.saveUrl({
        shortUrl: shortCode,
        originalUrl,
        createdAt,
      });

      const result = await urlService.getOriginalUrl(shortCode);
      expect(result).toBe(originalUrl);

      // Verify it was cached with the correct JSON structure
      const cachedResult = await mockCache.get(shortCode);
      expect(cachedResult).toBe(JSON.stringify({ originalUrl }));
    });

    it('should throw error if URL not found', async () => {
      const shortCode = 'nonexistent';
      await expect(urlService.getOriginalUrl(shortCode)).rejects.toThrow('URL not found');
    });
  });
}); 