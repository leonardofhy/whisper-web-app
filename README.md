# Whisper Web Transcription App

A modern web application for audio transcription using OpenAI Whisper, built with whisper.cpp backend.

## Features

- 🎤 **Multi-format Audio Support** - Upload MP3, WAV, M4A, OGG, FLAC and more
- 🌍 **Multi-language Support** - Supports 100+ languages including Chinese, English, Spanish, etc.
- 🚀 **Fast Processing** - Powered by whisper.cpp for efficient CPU/GPU inference
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🔄 **Real-time Progress** - Visual feedback during transcription
- 📋 **Easy Copy/Export** - Copy results or export to various formats

## Architecture

```
whisper-web-app/
├── frontend/              # Web interface (HTML/CSS/JavaScript)
├── backend/
│   └── whisper-cpp/      # Whisper.cpp submodule
├── docker-compose.yml    # Container orchestration
└── docs/                 # Documentation
```

## Quick Start with Docker

### Prerequisites

- Docker 24.0+ with Docker Compose
- NVIDIA Docker runtime (for GPU acceleration)
- At least 6GB free disk space (for large-v3 model)
- 8GB+ RAM recommended

### Simple Deployment

```bash
# Clone the repository
git clone --recursive https://github.com/leonardofhy/whisper-web-app.git
cd whisper-web-app

# Download the large-v3 model (supports Chinese and multilingual)
docker-compose --profile download-model up model-downloader

# Start GPU mode (recommended - uses official prebuilt image)
docker-compose --profile gpu-official up -d whisper-server-official web-frontend

# OR start CPU mode (uses official prebuilt image)
docker-compose --profile cpu-official up -d whisper-server-cpu-official web-frontend

# Check status
docker-compose ps

# View logs
docker-compose logs -f whisper-server-official
```

Access the application at:
- **Web Interface**: http://localhost:3000
- **API**: http://localhost:8081
- **Health Check**: http://localhost:8081/health

### Manual Setup (Development)

```bash
# Build whisper server
cd backend/whisper-cpp
make large-v3

# Start server
./build/bin/whisper-server -m models/ggml-large-v3.bin --convert --host 0.0.0.0 --port 8081

# In another terminal, start frontend
cd ../../frontend
python3 -m http.server 3000
```

## API Usage

The app provides a simple REST API:

```bash
# Basic transcription
curl http://localhost:8081/inference \
  -F file="@audio.mp3" \
  -F response_format="json" \
  -F language="zh"

# With additional parameters
curl http://localhost:8081/inference \
  -F file="@audio.wav" \
  -F response_format="verbose_json" \
  -F language="auto" \
  -F temperature="0.2"

# Health check
curl http://localhost:8081/health
```

## Advanced Configuration

### Deployment Options

1. **Official Images (Recommended)**
   - `--profile gpu-official`: Uses `ghcr.io/ggml-org/whisper.cpp:main-cuda`
   - `--profile cpu-official`: Uses `ghcr.io/ggml-org/whisper.cpp:main`
   - Pre-built, optimized, and regularly updated

2. **Custom Build**
   - `--profile gpu`: Builds from local whisper.cpp submodule with CUDA
   - `--profile cpu`: Builds from local whisper.cpp submodule with OpenBLAS
   - Useful for development or custom modifications

### Model Selection

The default model is `large-v3` for best multilingual support including Chinese. To change:

```bash
# Download different models
docker run --rm -v whisper-web-app_whisper-models:/models ghcr.io/ggml-org/whisper.cpp:main bash -c \
  "cd /models && wget -O ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin"

# Then edit docker-compose.yml to use the new model:
# Change "-m", "/models/ggml-large-v3.bin" to "-m", "/models/ggml-base.en.bin"
```

### Production Deployment

```bash
# With reverse proxy and production optimizations
docker-compose --profile gpu-official --profile production up -d
```

For detailed deployment instructions, see [docs/DOCKER.md](docs/DOCKER.md)

## Development

### Backend Development

```bash
# Build and test whisper.cpp locally
cd backend/whisper-cpp
make clean
make large-v3

# Test with sample audio
./build/bin/whisper-cli -f samples/jfk.wav -m models/ggml-large-v3.bin

# Test server mode
./build/bin/whisper-server -m models/ggml-large-v3.bin --host 127.0.0.1 --port 8081
```

### Frontend Development

```bash
# Start development server
cd frontend
python3 -m http.server 3000

# Edit files in frontend/ directory
# Changes are reflected immediately
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) - High-performance Whisper implementation
- [OpenAI Whisper](https://github.com/openai/whisper) - Original Whisper model
