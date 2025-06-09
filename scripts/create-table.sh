#!/bin/bash

TABLE_NAME="dev-tinyurl-table"
ENDPOINT_URL="http://localhost:8000"
REGION="ap-southeast-2"

# Check if table exists using local DynamoDB
if aws dynamodb describe-table \
  --table-name $TABLE_NAME \
  --endpoint-url $ENDPOINT_URL \
  --region $REGION 2>/dev/null; then
  echo "Table $TABLE_NAME already exists in local DynamoDB"
  exit 0
fi

# Create table if it doesn't exist
echo "Creating table $TABLE_NAME in local DynamoDB..."
aws dynamodb create-table \
  --table-name $TABLE_NAME \
  --attribute-definitions AttributeName=shortUrl,AttributeType=S \
  --key-schema AttributeName=shortUrl,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
  --endpoint-url $ENDPOINT_URL \
  --region $REGION

# Check if table creation was successful
if [ $? -eq 0 ]; then
  echo "Table $TABLE_NAME created successfully in local DynamoDB"
else
  echo "Failed to create table $TABLE_NAME in local DynamoDB"
  exit 1
fi