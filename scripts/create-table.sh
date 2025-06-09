#!/bin/bash

aws dynamodb create-table \
  --table-name dev-tinyurl-table \
  --attribute-definitions AttributeName=shortUrl,AttributeType=S \
  --key-schema AttributeName=shortUrl,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
  --endpoint-url http://localhost:8000 \
  --region ap-southeast-2