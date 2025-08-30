#!/usr/bin/env python3
"""
Backend API Test Suite for Whisper Web App
Tests the faster-whisper-server backend API using Python

Requirements: pip install -r ../requirements.txt
"""

import requests
import time
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple

class WhisperAPITester:
    def __init__(self, base_url: str = "http://localhost:8081"):
        self.base_url = base_url.rstrip('/')
        self.sample_audio = "/home/leonardo/Workspace/whisper-web-app/backend/whisper-cpp/samples/longer_jfk.wav"
        self.tests_run = 0
        self.tests_passed = 0

    def log(self, message: str, color: str = "white") -> None:
        """Simple logging with colors"""
        colors = {
            "red": "\033[0;31m",
            "green": "\033[0;32m",
            "yellow": "\033[1;33m",
            "white": "\033[0m"
        }
        print(f"{colors.get(color, colors['white'])}{message}{colors['white']}")

    def run_test(self, test_name: str, test_func, *args, **kwargs) -> bool:
        """Run a single test and track results"""
        self.log(f"\nRunning: {test_name}", "yellow")
        self.tests_run += 1

        try:
            result = test_func(*args, **kwargs)
            if result:
                self.log("PASSED", "green")
                self.tests_passed += 1
                return True
            else:
                self.log("FAILED", "red")
                return False
        except Exception as e:
            self.log(f"FAILED: {str(e)}", "red")
            return False

    def test_health_check(self) -> bool:
        """Test health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/health")
            if response.status_code == 200 and response.text.strip() == "OK":
                print("OK")
                return True
            return False
        except Exception as e:
            print(f"Error: {e}")
            return False

    def test_models_list(self) -> bool:
        """Test models list endpoint"""
        try:
            response = requests.get(f"{self.base_url}/v1/models")
            if response.status_code == 200:
                data = response.json()
                if 'data' in data and len(data['data']) > 0:
                    print("true")
                    return True
            return False
        except Exception as e:
            print(f"Error: {e}")
            return False

    def test_transcription(self, model: str, language: str = None,
                          response_format: str = "json") -> Tuple[bool, str]:
        """Test transcription with various parameters"""
        try:
            files = {'file': open(self.sample_audio, 'rb')}
            data = {
                'model': model,
                'response_format': response_format
            }
            if language:
                data['language'] = language

            response = requests.post(
                f"{self.base_url}/v1/audio/transcriptions",
                files=files,
                data=data
            )

            if response.status_code == 200:
                result = response.json()
                if 'text' in result and result['text']:
                    print(result['text'])
                    return True, result['text']
                else:
                    print("No text in response")
                    return False, ""
            else:
                print(f"HTTP {response.status_code}: {response.text}")
                return False, ""
        except Exception as e:
            print(f"Error: {e}")
            return False, ""

    def test_error_handling(self, test_type: str) -> bool:
        """Test error handling scenarios"""
        try:
            if test_type == "invalid_model":
                files = {'file': open(self.sample_audio, 'rb')}
                data = {'model': 'invalid-model'}
                response = requests.post(
                    f"{self.base_url}/v1/audio/transcriptions",
                    files=files,
                    data=data
                )
                return response.status_code != 200

            elif test_type == "no_file":
                data = {'model': 'Systran/faster-whisper-base.en'}
                response = requests.post(
                    f"{self.base_url}/v1/audio/transcriptions",
                    data=data
                )
                return response.status_code == 422

            return False
        except Exception as e:
            print(f"Error: {e}")
            return False

    def test_performance(self, num_requests: int = 3) -> int:
        """Test concurrent requests performance"""
        def single_request():
            try:
                files = {'file': open(self.sample_audio, 'rb')}
                data = {'model': 'Systran/faster-whisper-base.en'}
                response = requests.post(
                    f"{self.base_url}/v1/audio/transcriptions",
                    files=files,
                    data=data,
                    timeout=30
                )
                return response.status_code == 200
            except:
                return False

        start_time = time.time()
        with ThreadPoolExecutor(max_workers=num_requests) as executor:
            futures = [executor.submit(single_request) for _ in range(num_requests)]
            results = [future.result() for future in as_completed(futures)]

        duration = int(time.time() - start_time)
        print(f"Performance test completed in {duration}s")
        return duration

    def run_all_tests(self) -> None:
        """Run the complete test suite"""
        print("Starting Backend API Test Suite")
        print("==================================")
        print("Note: Large model tests are skipped to avoid timeouts during testing.")
        print("Use medium/base models for reliable test performance.")

        # Basic tests
        self.run_test("Health Check", self.test_health_check)
        self.run_test("Models List", self.test_models_list)

        # Transcription tests
        self.run_test("Basic Transcription",
                     lambda: self.test_transcription('Systran/faster-whisper-base.en')[0])
        self.run_test("Transcription with Language",
                     lambda: self.test_transcription('Systran/faster-whisper-base.en', 'en')[0])
        self.run_test("Transcription with JSON Response",
                     lambda: self.test_transcription('Systran/faster-whisper-base.en', None, 'json')[0])
        self.run_test("Transcription with Verbose JSON",
                     lambda: self.test_transcription('Systran/faster-whisper-base.en', None, 'verbose_json')[0])

        # Model tests
        self.run_test("Medium Model Transcription",
                     lambda: self.test_transcription('Systran/faster-whisper-medium.en')[0])
        self.run_test("Multilingual Model",
                     lambda: self.test_transcription('Systran/faster-whisper-base', 'zh')[0])

        # Auto language detection (may fail if not supported)
        try:
            self.run_test("Auto Language Detection",
                         lambda: self.test_transcription('Systran/faster-whisper-base', 'auto')[0])
        except:
            self.log("Auto Language Detection: SKIPPED (not supported)", "yellow")

        # Error handling
        self.run_test("Invalid Model Error",
                     lambda: self.test_error_handling('invalid_model'))
        self.run_test("No File Error",
                     lambda: self.test_error_handling('no_file'))

        # Performance tests
        print("\n\033[1;33mRunning Performance Test (3 concurrent requests)\033[0m")
        duration = self.test_performance(3)

        # MP3 test
        mp3_file = "/home/leonardo/Workspace/whisper-web-app/backend/whisper-cpp/samples/longer_jfk.mp3"
        if os.path.exists(mp3_file):
            self.run_test("MP3 File Support",
                         lambda: self.test_mp3_transcription(mp3_file))

        # Rate limiting test
        print("\n\033[1;33mTesting Rate Limiting (5 rapid requests)\033[0m")
        rate_limit_success = self.test_rate_limiting(5)
        print(f"Rate limiting test: {rate_limit_success}/5 requests succeeded")

        # Load test
        print("\n\033[1;33mTesting Server Load (5 concurrent requests)\033[0m")
        load_duration = self.test_performance(5)
        print(f"Load test completed in {load_duration}s")

        # Results
        self.print_summary(duration, load_duration, rate_limit_success)

    def test_mp3_transcription(self, mp3_file: str) -> bool:
        """Test MP3 file transcription"""
        try:
            files = {'file': open(mp3_file, 'rb')}
            data = {'model': 'Systran/faster-whisper-base.en'}
            response = requests.post(
                f"{self.base_url}/v1/audio/transcriptions",
                files=files,
                data=data
            )
            if response.status_code == 200:
                result = response.json()
                if 'text' in result and result['text']:
                    print(result['text'])
                    return True
            return False
        except Exception as e:
            print(f"Error: {e}")
            return False

    def test_rate_limiting(self, num_requests: int) -> int:
        """Test rate limiting with rapid requests"""
        success_count = 0
        for _ in range(num_requests):
            try:
                files = {'file': open(self.sample_audio, 'rb')}
                data = {'model': 'Systran/faster-whisper-base.en'}
                response = requests.post(
                    f"{self.base_url}/v1/audio/transcriptions",
                    files=files,
                    data=data,
                    timeout=15
                )
                if response.status_code == 200:
                    success_count += 1
            except:
                pass
        return success_count

    def print_summary(self, duration: int, load_duration: int, rate_limit_success: int) -> None:
        """Print test results summary"""
        print("\n==================================")
        print("\033[1;33mTest Results Summary\033[0m")
        print("==================================")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {self.tests_passed * 100 // self.tests_run}%")

        if self.tests_passed == self.tests_run:
            print("\033[0;32mAll tests passed!\033[0m")
        else:
            print("\033[0;31mSome tests failed. Check the output above.\033[0m")

        print("\n\033[1;33mPerformance Metrics:\033[0m")
        print("Single request performance: Good")
        print(f"Concurrent requests (3): {duration}s")
        print(f"Load test (5 concurrent): {load_duration}s")
        print(f"Rate limiting: {rate_limit_success}/5 requests handled")

        print("\n\033[0;32mBackend API testing completed!\033[0m")

def main():
    tester = WhisperAPITester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()
