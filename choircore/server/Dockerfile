FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY index.mjs ./
ENV NODE_ENV=production PORT=8090
EXPOSE 8090/tcp
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp
USER node
CMD ["node","index.mjs"]
