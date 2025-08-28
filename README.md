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
├── frontend/           # Web interface (HTML/CSS/JavaScript)
├── backend/            # API server (Node.js/Python)
├── docker-compose.yml  # Container orchestration
└── docs/              # Documentation
```

## Quick Start

### Prerequisites

- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) server running
- Node.js 18+ (for backend)
- Modern web browser

### Installation

1. Clone the repository:
```bash
git clone https://github.com/leonardofhy/whisper-web-app.git
cd whisper-web-app
```

2. Start whisper.cpp server:
```bash
# In whisper.cpp directory
./build/bin/whisper-server -m models/ggml-large-v3.bin --convert --port 8081
```

3. Run the web application:
```bash
# Development
cd frontend
python -m http.server 3000

# Or with Node.js backend
cd backend
npm install
npm start
```

4. Open http://localhost:3000

## API Usage

The app provides a simple REST API:

```bash
curl http://localhost:8081/inference \
  -F file="@audio.mp3" \
  -F response_format="json" \
  -F language="zh"
```

## Deployment

### Docker (Recommended)

```bash
docker-compose up -d
```

### Manual Deployment

1. Deploy whisper server on GPU-enabled machine
2. Deploy web app on static hosting (Vercel, Netlify)
3. Configure CORS and API endpoints

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