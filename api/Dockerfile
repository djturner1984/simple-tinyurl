FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"] 