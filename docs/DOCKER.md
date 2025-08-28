# Docker Deployment Guide

This guide explains how to deploy the Whisper Web App using Docker.

## Quick Start

### Prerequisites

- Docker 24.0+ with Docker Compose
- NVIDIA Docker runtime (for GPU acceleration)
- At least 4GB free disk space
- 8GB+ RAM recommended

### Simple Deployment

```bash
# Clone the repository
git clone https://github.com/leonardofhy/whisper-web-app.git
cd whisper-web-app

# Download the large-v3 model first
docker-compose --profile download-model up model-downloader

# Start GPU mode (recommended - uses official prebuilt image)
docker-compose --profile gpu-official up -d whisper-server-official web-frontend

# OR start CPU mode (uses official prebuilt image)
docker-compose --profile cpu-official up -d whisper-server-cpu-official web-frontend

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Access the application at:
- **Web Interface**: https://localhost:3443 (HTTPS) or http://localhost:3080 (HTTP)
- **API**: http://localhost:8081

## New Features

### Audio Recording Download
The web interface now supports downloading recorded audio files:
1. Record audio using the "Record Audio" feature
2. After recording, click the "💾 Download" button to save the audio file

### Improved Transcription Quality
Fixed transcription truncation issues by removing character length limitations:
- Full transcription output for long audio files (5+ minutes)
- No more truncation to 30 words for lengthy recordings
- Better handling of continuous speech segments
- Added `--max-len 0` parameter to all whisper server configurations

### Enhanced GPU Backend
Improved Docker GPU configuration with:
- Proper CUDA 12.4 support in custom builds
- Automatic backend failover between different server profiles
- Optimized nginx upstream configuration for multiple backend services
- Better error handling and timeout management

## Configuration Options

### Deployment Options

**GPU (Recommended - Official Image)**
```bash
# Uses official prebuilt CUDA-enabled image
docker-compose --profile gpu-official up -d
```

**GPU (Custom Build)**
```bash
# Uses custom Dockerfile with CUDA 12.0
docker-compose --profile gpu up -d
```

**CPU Only (Official Image)**
```bash
# Uses official prebuilt CPU-only image
docker-compose --profile cpu-official up -d
```

**CPU Only (Custom Build)**
```bash
# Uses custom Dockerfile with OpenBLAS optimization
docker-compose --profile cpu up -d
```

### Model Selection

The configuration now defaults to `large-v3` model which supports Chinese and other languages. To change the model:

1. **Using Official Images**: Edit the command in `docker-compose.yml`:
```yaml
command: [
  "whisper-server",
  "-m", "/models/ggml-base.en.bin",  # Change this line
  "--convert",
  "--host", "0.0.0.0",
  "--port", "8081"
]
```

2. **Using Custom Build**: Edit the Dockerfiles to change `make large-v3` to `make base.en` or other models.

3. **Download Different Models**: Modify the model-downloader service:
```bash
# Download base model instead
docker run --rm -v whisper-web-app_whisper-models:/models ghcr.io/ggml-org/whisper.cpp:main bash -c "cd /models && wget -O ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin"
```

### Environment Variables

Create `.env` file:

```env
# Port configuration
WHISPER_PORT=8081
WEB_PORT=3000

# Model configuration
WHISPER_MODEL=large-v3
WHISPER_LANGUAGE=auto

# Resource limits
CUDA_VISIBLE_DEVICES=0
WHISPER_THREADS=4
```

## Production Deployment

### With Reverse Proxy

```bash
# Start with nginx reverse proxy
docker-compose --profile production up -d
```

This sets up:
- **Port 80**: Web interface via nginx
- **Rate limiting**: 10 requests per minute per IP
- **CORS handling**: Proper API access
- **File upload limits**: 100MB max

### SSL/HTTPS Setup

1. Add SSL certificates to `ssl/` directory
2. Update `nginx.conf`:

```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of config
}
```

### Health Monitoring

```bash
# Check service health
curl http://localhost/health
curl http://localhost:8081/health

# Monitor resource usage
docker stats

# View detailed logs
docker-compose logs whisper-server
```

## Development

### Local Development with Hot Reload

```bash
# Start only whisper server
docker-compose up whisper-server

# Run frontend locally for development
cd frontend
python3 -m http.server 3000
```

### Custom Model

```bash
# Mount custom model
docker run -v $(pwd)/custom-models:/app/models \
  whisper-web-app_whisper-server
```

## Troubleshooting

### Common Issues

**GPU not detected**
```bash
# Check NVIDIA Docker runtime
docker run --rm --gpus all nvidia/cuda:12.0-runtime-ubuntu22.04 nvidia-smi

# Test official whisper.cpp GPU image
docker run --rm --gpus all ghcr.io/ggml-org/whisper.cpp:main-cuda nvidia-smi
```

**Out of memory**
```bash
# Use smaller model (edit docker-compose.yml command)
command: [
  "whisper-server",
  "-m", "/models/ggml-base.en.bin",
  "--convert",
  "--host", "0.0.0.0",
  "--port", "8081"
]
```

**CORS errors**
```bash
# Check if nginx proxy is running
docker-compose ps reverse-proxy
```

**Slow transcription**
```bash
# Check resource usage
docker exec whisper-server nvidia-smi  # GPU
docker exec whisper-server top         # CPU
```

**Transcription cuts off/incomplete output**
This issue has been resolved in the current version. If you're still experiencing truncation:
```bash
# Restart services to apply the --max-len 0 fix
docker-compose down
docker-compose --profile gpu-official up -d

# Or rebuild custom images if needed
docker-compose down
docker-compose --profile gpu up --build -d
```

### Performance Tuning

**For high-volume usage:**

```yaml
services:
  whisper-server:
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G
    environment:
      - WHISPER_THREADS=8
      - WHISPER_PROCESSORS=2
```

**Scale horizontally:**

```yaml
services:
  whisper-server:
    deploy:
      replicas: 3
    ports:
      - "8081-8083:8081"
```

## Commands Reference

```bash
# Download model first
docker-compose --profile download-model up model-downloader

# Start GPU mode (official image - recommended)
docker-compose --profile gpu-official up -d

# Start CPU mode (official image)
docker-compose --profile cpu-official up -d

# Build and start custom images
docker-compose --profile gpu up --build -d

# Stop all services
docker-compose down

# Update official images
docker-compose pull
docker-compose --profile gpu-official up -d

# View logs
docker-compose logs -f whisper-server-official
docker-compose logs -f web-frontend

# Clean up
docker-compose down -v --remove-orphans
docker system prune -f

# Backup models
docker run --rm -v whisper-web-app_whisper-models:/source -v $(pwd):/backup alpine tar czf /backup/models-backup.tar.gz -C /source .

# Restore models
docker run --rm -v whisper-web-app_whisper-models:/target -v $(pwd):/backup alpine tar xzf /backup/models-backup.tar.gz -C /target
```

## Security

### Production Checklist

- [ ] Enable rate limiting
- [ ] Set up SSL/HTTPS
- [ ] Use strong authentication
- [ ] Limit file upload sizes
- [ ] Monitor resource usage
- [ ] Keep Docker images updated
- [ ] Use non-root containers
- [ ] Enable firewall rules

### Network Security

```yaml
networks:
  whisper-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## Backup and Recovery

```bash
# Backup models and data
docker-compose exec whisper-server tar -czf /tmp/models.tar.gz /app/models
docker cp whisper-server:/tmp/models.tar.gz ./backup/

# Restore
docker cp ./backup/models.tar.gz whisper-server:/tmp/
docker-compose exec whisper-server tar -xzf /tmp/models.tar.gz -C /app/
```