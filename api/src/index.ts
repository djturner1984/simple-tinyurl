import express, { RequestHandler } from 'express';
import cors from 'cors';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import Redis from 'ioredis';
import dotenv from 'dotenv';
   

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

app.use(cors());
app.use(express.json());

function generateShortUrl(): string {
  return Math.random().toString(36).substring(2, 8);
}

// POST /tinyUrl
app.post('/tinyUrl', (async (req, res) => {
  console.log('Received POST request:', req.body);
  const { originalUrl } = req.body;
  if (typeof originalUrl !== 'string') {
    console.log('Invalid request body:', req.body);
    return res.status(400).json({ error: 'originalUrl are required as strings' });
  }

  const shortUrl = generateShortUrl();
  console.log('Generated short URL:', shortUrl);
  
  try {
    // Write to DynamoDB
    console.log('Writing to DynamoDB...');
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        shortUrl,
        originalUrl,
        createdAt: new Date().toISOString(),
      },
    }));
    console.log('Successfully wrote to DynamoDB');

    // Return the full URL
    const fullShortUrl = `http://localhost:3001/${shortUrl}`;
    res.json({ shortUrl: fullShortUrl });
  } catch (error) {
    console.error('Detailed error:', error);
    res.status(500).json({ error: 'Failed to create short URL' });
  }
}) as RequestHandler);

// GET /tinyUrl/:shortUrl
app.get('/tinyUrl/:shortUrl', (async (req, res) => {
  const { shortUrl } = req.params;
  console.log(`\n[GET /tinyUrl/${shortUrl}] Request received`);
  
  try {
    // Try to get from Redis first
    console.log('Checking Redis cache...');
    const cachedData = await redis.get(shortUrl);
    if (cachedData) {
      console.log('✅ Cache HIT - Data found in Redis');
      const { originalUrl } = JSON.parse(cachedData);
      return res.json({ originalUrl });
    }
    console.log('❌ Cache MISS - Data not found in Redis');

    // If not in Redis, get from DynamoDB
    console.log('Fetching from DynamoDB...');
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { shortUrl },
    }));

    if (!result.Item) {
      console.log('❌ Not found in DynamoDB');
      return res.status(404).json({ error: 'Not found' });
    }

    console.log('✅ Found in DynamoDB');
    const { originalUrl } = result.Item;

    // Cache in Redis for future requests
    console.log('Caching in Redis for future requests...');
    await redis.set(shortUrl, JSON.stringify({ originalUrl }));
    console.log('✅ Successfully cached in Redis');

    res.json({ originalUrl });
  } catch (error) {
    console.error('Error retrieving URL:', error);
    res.status(500).json({ error: 'Failed to retrieve URL' });
  }
}) as RequestHandler);

// GET /:shortUrl
app.get('/:shortUrl', (async (req, res) => {
  const { shortUrl } = req.params;
  console.log(`\n[GET /${shortUrl}] Redirect request received`);
  
  try {
    // Try to get from Redis first
    console.log('Checking Redis cache...');
    const cachedData = await redis.get(shortUrl);
    if (cachedData) {
      console.log('✅ Cache HIT - Data found in Redis');
      const { originalUrl } = JSON.parse(cachedData);
      return res.redirect(originalUrl);
    }
    console.log('Cache MISS - Data not found in Redis');

    // If not in Redis, get from DynamoDB
    console.log('Fetching from DynamoDB...');
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { shortUrl },
    }));

    if (!result.Item) {
      console.log('Not found in DynamoDB');
      return res.status(404).send('Not found');
    }

    console.log('Found in DynamoDB');
    const { originalUrl } = result.Item;

    // Cache in Redis for future requests
    console.log('Caching in Redis for future requests...');
    await redis.set(shortUrl, JSON.stringify({ originalUrl }));
    console.log('Successfully cached in Redis');

    res.redirect(originalUrl);
  } catch (error) {
    console.error('Error retrieving URL:', error);
    res.status(500).send('Failed to retrieve URL');
  }
}) as RequestHandler);

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
}); 