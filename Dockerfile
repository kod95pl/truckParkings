# Dockerfile
FROM node:18-alpine

WORKDIR /app

# copy only package files first for better caching
COPY package*.json ./

RUN npm ci --production

# copy project files
COPY . .

# create data folder
RUN mkdir -p /app/data/parkings /app/data/fuel

EXPOSE 3000
CMD ["node", "server.js"]
