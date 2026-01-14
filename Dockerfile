FROM node:20.17.0-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN --mount=type=cache,target=/root/.npm npm install --production

# Copy application files
#COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]