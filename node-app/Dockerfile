# Using image
FROM node:18-slim

# Create app directory
WORKDIR /app

# Copy Files
COPY package*.json ./
COPY server.js .

# Install dependencies
RUN npm install

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]