import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { IUrlRepository, UrlRecord } from '../types';

export class DynamoUrlRepository implements IUrlRepository {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(docClient: DynamoDBDocumentClient, tableName: string) {
    this.docClient = docClient;
    this.tableName = tableName;
  }

  async saveUrl(record: UrlRecord): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: record,
    }));
  }

  async getUrl(shortUrl: string): Promise<UrlRecord | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { shortUrl },
    }));

    return result.Item as UrlRecord || null;
  }
} 