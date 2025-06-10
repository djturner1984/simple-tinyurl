import { ICache, IUrlRepository, IUrlService, UrlRecord } from '../types';

export class UrlService implements IUrlService {
  private readonly repository: IUrlRepository;
  private readonly cache: ICache;
  private readonly baseUrl: string;

  constructor(repository: IUrlRepository, cache: ICache, baseUrl: string) {
    this.repository = repository;
    this.cache = cache;
    this.baseUrl = baseUrl;
  }

  private generateShortUrl(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  async createShortUrl(originalUrl: string): Promise<string> {
    const shortUrl = this.generateShortUrl();
    const record: UrlRecord = {
      shortUrl,
      originalUrl,
      createdAt: new Date().toISOString(),
    };

    await this.repository.saveUrl(record);
    return `${this.baseUrl}/${shortUrl}`;
  }

  async getOriginalUrl(shortUrl: string): Promise<string> {
    // Try cache first
    const cachedData = await this.cache.get(shortUrl);
    if (cachedData) {
      const { originalUrl } = JSON.parse(cachedData);
      return originalUrl;
    }

    // If not in cache, get from repository
    const record = await this.repository.getUrl(shortUrl);
    if (!record) {
      throw new Error('URL not found');
    }

    // Cache the result
    await this.cache.set(shortUrl, JSON.stringify({ originalUrl: record.originalUrl }));
    return record.originalUrl;
  }
} 