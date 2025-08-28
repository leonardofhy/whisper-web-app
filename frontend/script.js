// Configuration
const API_BASE_URL = '/api';
const API_ENDPOINT = `${API_BASE_URL}/inference`;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const audioFile = document.getElementById('audioFile');
const fileList = document.getElementById('fileList');
const languageSelect = document.getElementById('language');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultSection = document.getElementById('resultSection');
const transcriptionResult = document.getElementById('transcriptionResult');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Global variables
let uploadedFiles = [];
let currentTranscription = '';
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingStartTime = null;

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkServerHealth();
});

function setupEventListeners() {
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // File input
    audioFile.addEventListener('change', handleFileSelect);
    
    // Result actions
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadTranscription);
    
    // Recording controls
    document.getElementById('recordBtn').addEventListener('click', showRecordingSection);
    document.getElementById('startRecord').addEventListener('click', startRecording);
    document.getElementById('stopRecord').addEventListener('click', stopRecording);
    document.getElementById('playRecord').addEventListener('click', playRecording);
    document.getElementById('useRecord').addEventListener('click', useRecording);
    document.getElementById('cancelRecord').addEventListener('click', cancelRecording);
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave() {
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('audio/')
    );
    
    if (files.length > 0) {
        handleFiles(files);
    } else {
        showError('Please upload audio files only');
    }
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        handleFiles(files);
    }
}

function handleFiles(files) {
    uploadedFiles = files;
    displayFileList(files);
}

function displayFileList(files) {
    fileList.innerHTML = '';
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
            <button class="btn btn-primary" onclick="transcribeFile(${index})">
                🎤 Transcribe
            </button>
        `;
        fileList.appendChild(fileItem);
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function transcribeFile(fileIndex) {
    const file = uploadedFiles[fileIndex];
    if (!file) return;

    showProgress();
    hideResult();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('response_format', 'json');
    
    const selectedLanguage = languageSelect.value;
    if (selectedLanguage !== 'auto') {
        formData.append('language', selectedLanguage);
    }

    try {
        // Start progress animation
        animateProgress();

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Complete progress
        setProgress(100);
        
        setTimeout(() => {
            hideProgress();
            showResult(data.text || 'No transcription available', false);
        }, 500);

    } catch (error) {
        console.error('Transcription error:', error);
        hideProgress();
        showResult(`Error: ${error.message}\n\nMake sure the Whisper server is running on ${API_BASE_URL}`, true);
    }
}

function showProgress() {
    progressSection.style.display = 'block';
    setProgress(0);
    progressText.textContent = 'Uploading and processing...';
}

function hideProgress() {
    progressSection.style.display = 'none';
}

function setProgress(percentage) {
    progressFill.style.width = percentage + '%';
}

function animateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) {
            progress = 90;
            clearInterval(interval);
        }
        setProgress(progress);
    }, 300);
    
    // Store interval for cleanup if needed
    window.progressInterval = interval;
}

function showResult(text, isError = false) {
    currentTranscription = text;
    transcriptionResult.textContent = text;
    transcriptionResult.className = isError ? 'transcription-result error' : 'transcription-result';
    resultSection.style.display = 'block';
}

function hideResult() {
    resultSection.style.display = 'none';
}

function copyToClipboard() {
    navigator.clipboard.writeText(currentTranscription).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentTranscription;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    });
}

function downloadTranscription() {
    const blob = new Blob([currentTranscription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            console.log('✅ Whisper server is running');
        }
    } catch (error) {
        console.warn('⚠️ Cannot connect to Whisper server:', error.message);
        showError(`Warning: Cannot connect to Whisper server at ${API_BASE_URL}`);
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 8px;
        border-left: 4px solid #dc3545;
        z-index: 1000;
        max-width: 400px;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        document.body.removeChild(errorDiv);
    }, 5000);
}

// Recording functions
function showRecordingSection() {
    document.getElementById('recordingSection').style.display = 'block';
    document.getElementById('fileList').style.display = 'none';
}

function hideRecordingSection() {
    document.getElementById('recordingSection').style.display = 'none';
    document.getElementById('fileList').style.display = 'block';
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const audioElement = document.getElementById('recordedAudio');
            audioElement.src = audioUrl;
            audioElement.style.display = 'block';
            
            // Show control buttons
            document.getElementById('playRecord').style.display = 'inline-block';
            document.getElementById('useRecord').style.display = 'inline-block';
            
            // Stop all tracks to free up the microphone
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        recordingStartTime = Date.now();
        
        // Update UI
        document.getElementById('startRecord').style.display = 'none';
        document.getElementById('stopRecord').style.display = 'inline-block';
        document.getElementById('recordingTimer').style.display = 'block';
        
        // Start timer
        recordingTimer = setInterval(updateRecordingTimer, 1000);
        
    } catch (error) {
        showError('Could not access microphone. Please allow microphone access and try again.');
        console.error('Recording error:', error);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    // Clear timer
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    // Update UI
    document.getElementById('startRecord').style.display = 'inline-block';
    document.getElementById('stopRecord').style.display = 'none';
    document.getElementById('recordingTimer').style.display = 'none';
}

function updateRecordingTimer() {
    if (recordingStartTime) {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('recordingTimer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function playRecording() {
    const audioElement = document.getElementById('recordedAudio');
    if (audioElement.paused) {
        audioElement.play();
        document.getElementById('playRecord').textContent = 'Pause';
    } else {
        audioElement.pause();
        document.getElementById('playRecord').textContent = 'Play';
    }
}

function useRecording() {
    const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
    const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
    
    // Add to files list and start transcription
    uploadedFiles = [file];
    displayFileList([file]);
    hideRecordingSection();
    
    // Auto-start transcription
    transcribeFile(0);
}

function cancelRecording() {
    // Stop recording if active
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    // Clear timer
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    // Reset UI
    document.getElementById('startRecord').style.display = 'inline-block';
    document.getElementById('stopRecord').style.display = 'none';
    document.getElementById('playRecord').style.display = 'none';
    document.getElementById('useRecord').style.display = 'none';
    document.getElementById('recordingTimer').style.display = 'none';
    document.getElementById('recordedAudio').style.display = 'none';
    
    // Clear recorded data
    recordedChunks = [];
    recordingStartTime = null;
    
    hideRecordingSection();
}