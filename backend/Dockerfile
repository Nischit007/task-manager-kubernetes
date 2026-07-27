FROM node:20-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source
COPY src/ ./src/

# Set environment
ENV NODE_ENV=production

# Expose the default port
EXPOSE 3000

# Start the application
CMD ["node", "src/index.js"]
