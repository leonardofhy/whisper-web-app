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

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Access the application at:
- **Web Interface**: http://localhost:3000
- **API**: http://localhost:8081

## Configuration Options

### GPU vs CPU

**GPU (Default - Recommended)**
```yaml
# Uses NVIDIA GPU for faster transcription
services:
  whisper-server:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

**CPU Only**
```bash
# Remove GPU configuration and start
docker-compose up -d whisper-server-cpu web-frontend
```

### Model Selection

Edit `Dockerfile.whisper` to change the model:

```dockerfile
# For better accuracy (larger model)
RUN bash ./models/download-ggml-model.sh large-v3

# For Chinese optimization
RUN bash ./models/download-ggml-model.sh large-v3
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
docker run --rm --gpus all nvidia/cuda:12.4-runtime-ubuntu22.04 nvidia-smi
```

**Out of memory**
```bash
# Use smaller model
RUN bash ./models/download-ggml-model.sh base.en
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
# Build and start
docker-compose up --build -d

# Stop all services
docker-compose down

# Update to latest
git pull
docker-compose build --no-cache
docker-compose up -d

# View logs
docker-compose logs -f whisper-server
docker-compose logs -f web-frontend

# Clean up
docker-compose down -v --remove-orphans
docker system prune -f

# Backup models
docker cp whisper-server:/app/models ./backup-models/
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