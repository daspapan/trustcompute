# Build from the repository root:  docker build -f backend/Dockerfile .
# Stage 1: compile the Rust verifier
FROM rust:1-slim-bookworm AS verifier
WORKDIR /src
COPY verifier ./verifier
RUN cargo build --release --manifest-path verifier/Cargo.toml

# Stage 2: run the Express backend with the verifier binary
FROM node:20-bookworm-slim
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend ./
COPY --from=verifier /src/verifier/target/release/nodebridge-verifier /usr/local/bin/nodebridge-verifier
ENV VERIFIER_BIN=/usr/local/bin/nodebridge-verifier
ENV PORT=4000
EXPOSE 4000
CMD ["node", "src/server.js"]
