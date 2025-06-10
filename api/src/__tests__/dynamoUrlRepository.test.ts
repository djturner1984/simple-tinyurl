import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoUrlRepository } from '../repositories/dynamoUrlRepository';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the AWS SDK
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: jest.fn(),
  GetCommand: jest.fn(),
  PutCommand: jest.fn(),
}));

type MockSendResponse = {
  Item?: {
    shortUrl: string;
    originalUrl: string;
    createdAt: string;
  };
};

describe('DynamoUrlRepository', () => {
  let repository: DynamoUrlRepository;
  let mockDocClient: jest.Mocked<DynamoDBDocumentClient>;
  const TABLE_NAME = 'test-table';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a mock document client with proper typing
    mockDocClient = {
      send: jest.fn().mockImplementation(async (command) => {
        if (command instanceof GetCommand) {
          return { Item: undefined };
        }
        return {};
      }),
    } as unknown as jest.Mocked<DynamoDBDocumentClient>;

    // Create repository instance
    repository = new DynamoUrlRepository(mockDocClient, TABLE_NAME);
  });

  describe('saveUrl', () => {
    it('should save a URL record to DynamoDB', async () => {
      const record = {
        shortUrl: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: new Date().toISOString(),
      };

      await repository.saveUrl(record);

      expect(PutCommand).toHaveBeenCalledWith({
        TableName: TABLE_NAME,
        Item: record,
      });
      expect(mockDocClient.send).toHaveBeenCalled();
    });
  });

  describe('getUrl', () => {
    it('should return URL record when found', async () => {
      const record = {
        shortUrl: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: new Date().toISOString(),
      };

      const mockSend = mockDocClient.send as jest.Mock;
      mockSend.mockImplementationOnce(async () => ({
        Item: record,
      }));

      const result = await repository.getUrl('abc123');

      expect(GetCommand).toHaveBeenCalledWith({
        TableName: TABLE_NAME,
        Key: { shortUrl: 'abc123' },
      });
      expect(result).toEqual(record);
    });

    it('should return null when URL not found', async () => {
      const mockSend = mockDocClient.send as jest.Mock;
      mockSend.mockImplementationOnce(async () => ({
        Item: undefined,
      }));

      const result = await repository.getUrl('nonexistent');

      expect(GetCommand).toHaveBeenCalledWith({
        TableName: TABLE_NAME,
        Key: { shortUrl: 'nonexistent' },
      });
      expect(result).toBeNull();
    });

    it('should handle DynamoDB errors', async () => {
      const error = new Error('DynamoDB error');
      const mockSend = mockDocClient.send as jest.Mock;
      mockSend.mockImplementationOnce(async () => {
        throw error;
      });

      await expect(repository.getUrl('abc123')).rejects.toThrow('DynamoDB error');
    });
  });
}); 