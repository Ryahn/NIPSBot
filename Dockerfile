FROM node:20-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
COPY knexfile.js ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY .env ./

EXPOSE 5532 5432

CMD ["npm", "run", "migrate"]
CMD ["npm", "run", "start"]