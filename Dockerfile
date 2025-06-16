FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    python3-dev \
    py3-setuptools \
    make \
    g++ \
    pkgconfig \
    # Development packages
    cairo-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    # Runtime packages
    cairo \
    pango \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype \
    fontconfig \
    ttf-dejavu

RUN apk add --no-cache ttf-freefont

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

CMD ["sh", "-c", "npm run migrate && npm run start"]