import express, { RequestHandler } from 'express';
import cors from 'cors';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { DynamoUrlRepository } from './repositories/dynamoUrlRepository';
import { RedisCache } from './cache/redisCache';
import { UrlService } from './services/urlService';

dotenv.config();

const app = express();
const port = 3001;

// AWS Configuration
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  endpoint: process.env.DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'dev-tinyurl-table';

// Redis Configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

// Initialize services
const repository = new DynamoUrlRepository(docClient, TABLE_NAME);
const cache = new RedisCache(redis);
const urlService = new UrlService(repository, cache, `http://localhost:${port}`);

app.use(cors());
app.use(express.json());

// POST /tinyUrl
app.post('/tinyUrl', (async (req, res) => {
  console.log('Received POST request:', req.body);
  const { originalUrl } = req.body;
  if (typeof originalUrl !== 'string') {
    console.log('Invalid request body:', req.body);
    return res.status(400).json({ error: 'originalUrl is required as a string' });
  }

  try {
    const shortUrl = await urlService.createShortUrl(originalUrl);
    res.json({ shortUrl });
  } catch (error: any) {
    console.error('Error creating short URL:', error);
    res.status(500).json({ error: 'Failed to create short URL' });
  }
}) as RequestHandler);

// GET /tinyUrl/:shortUrl
app.get('/tinyUrl/:shortUrl', (async (req, res) => {
  const { shortUrl } = req.params;
  console.log(`\n[GET /tinyUrl/${shortUrl}] Request received`);
  
  try {
    const originalUrl = await urlService.getOriginalUrl(shortUrl);
    res.json({ originalUrl });
  } catch (error: any) {
    if (error.message === 'URL not found') {
      return res.status(404).json({ error: 'Not found' });
    }
    console.error('Error retrieving URL:', error);
    res.status(500).json({ error: 'Failed to retrieve URL' });
  }
}) as RequestHandler);

// GET /:shortUrl
app.get('/:shortUrl', (async (req, res) => {
  const { shortUrl } = req.params;
  console.log(`\n[GET /${shortUrl}] Redirect request received`);
  
  try {
    const originalUrl = await urlService.getOriginalUrl(shortUrl);
    res.redirect(originalUrl);
  } catch (error: any) {
    if (error.message === 'URL not found') {
      return res.status(404).send('Not found');
    }
    console.error('Error retrieving URL:', error);
    res.status(500).send('Failed to retrieve URL');
  }
}) as RequestHandler);

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
}); 