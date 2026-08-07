# ============================================================
# VoiceShield — Multi-stage Dockerfile
#
# Stage 1 (builder): Node.js — installs npm deps + Vite build
# Stage 2 (runtime): Python — FastAPI offline server
#
# Build:
#   docker build -t voiceshield:latest .
#
# Run:
#   docker run -p 8080:8080 \
#     -e AIML_API_KEY=sk-... \
#     -e SPEECHMATICS_API_KEY=... \
#     voiceshield:latest
#
# Security notes:
#   - API keys are passed at runtime via environment variables ONLY.
#     Never hard-code keys in this file or in build-args.
#   - The Python layer runs as a non-root user (voiceshield:1000).
#   - Node build layer is discarded; only dist/ and serve.py are
#     copied to the runtime image — no node_modules in production.
# ============================================================

# ── Stage 1: frontend build ──────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Copy dependency manifests first (layer cache)
COPY package.json package-lock.json ./

# Install all deps (devDeps needed for the Vite build)
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Python runtime ──────────────────────────────────
FROM python:3.12-slim AS runtime

# ── Security: non-root user ──────────────────────────────────
RUN groupadd --gid 1000 voiceshield \
 && useradd  --uid 1000 --gid 1000 --no-create-home voiceshield

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Python server
COPY serve.py .

# Copy the pre-built static frontend from the builder stage
COPY --from=builder /build/dist ./dist

# Drop privileges
USER voiceshield

# Expose the server port
EXPOSE 8080

# ── Healthcheck ──────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/api/health')"

# ── Entrypoint ───────────────────────────────────────────────
ENV PORT=8080
CMD ["python", "serve.py"]
