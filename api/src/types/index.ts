export interface UrlRecord {
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
}

export interface IUrlRepository {
  saveUrl(record: UrlRecord): Promise<void>;
  getUrl(shortUrl: string): Promise<UrlRecord | null>;
}

export interface ICache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface IUrlService {
  createShortUrl(originalUrl: string): Promise<string>;
  getOriginalUrl(shortUrl: string): Promise<string>;
} 