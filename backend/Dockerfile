# Official Node image via AWS ECR Public mirror — avoids Docker Hub rate limits (429).
FROM public.ecr.aws/docker/library/node:22-bookworm-slim

WORKDIR /app

# Toolchain for the better-sqlite3 source build in postinstall.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
CMD ["node", "server.js"]
