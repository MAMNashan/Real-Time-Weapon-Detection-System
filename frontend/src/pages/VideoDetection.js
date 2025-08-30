import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from "../services/useSocket";
import { io } from "socket.io-client";
import { useNavigate } from 'react-router-dom';
import { authService, detectionService } from '../services/api';
import axios from 'axios';

const VideoDetection = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [resultVideo, setResultVideo] = useState(null);
  const [error, setError] = useState(null);
  const [resultSource, setResultSource] = useState(null); // "rest" or "websocket"

  // WebSocket and session state
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9));
  const videoRef = useRef(null);
  const resultVideoRef = useRef(null);
  const navigate = useNavigate();
  const joinedRef = useRef(false);
  const [processingStarted, setProcessingStarted] = useState(false);
  const [liveImage, setLiveImage] = useState(null);
  const [liveMeta, setLiveMeta] = useState({ frame: 0, timestamp: "", detections: 0 });
  const [frameHistory, setFrameHistory] = useState([]);
  const [detectionAlert, setDetectionAlert] = useState(null);
  const audioCtxRef = useRef(null);
  const alertAudioRef = useRef(null);
  const lastGunSoundAtRef = useRef(0);
  const [isMuted, setIsMuted] = useState(false);
  const SOUND_COOLDOWN_MS = 4000;

  useEffect(() => {
    // Preload alert sound (served from public/)
    try {
      const audio = new Audio('/alert.mp3');
      audio.preload = 'auto';
      alertAudioRef.current = audio;
    } catch {}
  }, []);

  const playGunSound = useCallback(() => {
    if (isMuted) return;
    try {
      const audio = alertAudioRef.current || new Audio('/alert-sound-87478.mp3');
      alertAudioRef.current = audio;
      try { audio.currentTime = 0; } catch {}
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {}); // ignore autoplay errors
      }
    } catch {}
  }, [isMuted]);
  const lastAlertFrameRef = useRef(null);
  const playAlarm = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;
      let now = ctx.currentTime;
      const beep = (freq, duration) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, now);
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
        o.start(now);
        o.stop(now + duration);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        now += duration + 0.05;
      };
      // Two quick beeps
      beep(1000, 0.18);
      beep(1200, 0.18);
    } catch (e) {
      // Ignore audio errors 
    }
  }, []);

  // --- WebSocket integration ---
  const { connected, messages, ping, broadcast, join, sendToRoom, wsStarted, wsFrame, wsProgress, wsComplete, wsError } = useSocket();

  // Join the room matching this sessionId as soon as the socket connects (guard against repeated joins)
  useEffect(() => {
    if (connected && sessionId && !joinedRef.current) {
      join(sessionId);
      joinedRef.current = true;
      console.log("Joined WS room:", sessionId);
    }
  }, [connected, sessionId, join]);

  // Reset join guard on disconnect so we can rejoin after reconnects
  useEffect(() => {
    if (!connected) {
      joinedRef.current = false;
    }
  }, [connected]);

  // Handle WS lifecycle for live preview and final video
  useEffect(() => {
    if (!wsStarted) return;
    setProcessingStarted(true);
    setLiveImage(null);
    setLiveMeta({ frame: 0, timestamp: "", detections: 0 });
    setDetectionAlert(null);
    setFrameHistory([]);
    lastAlertFrameRef.current = null;
    // Reset progress at start
    setProcessingProgress(0);
  }, [wsStarted]);

  useEffect(() => {
    if (!wsFrame) return;
    try {
      const img = wsFrame.image_base64 ? `data:image/jpeg;base64,${wsFrame.image_base64}` : null;
      if (img) setLiveImage(img);
      const detectionsCount = Array.isArray(wsFrame.detections) ? wsFrame.detections.length : 0;
      const gunCount = (Array.isArray(wsFrame.detections) ? wsFrame.detections : []).filter(d => typeof d.class === 'string' && /gun/i.test(d.class)).length;
      setLiveMeta({
        frame: wsFrame.frame_index ?? 0,
        timestamp: wsFrame.timestamp ?? "",
        detections: detectionsCount
      });

      if (detectionsCount > 0) {
        // Raise alert banner and append to detection history (only when there are detections)
        const classes = (wsFrame.detections || []).map(d => d.class);
        const counts = classes.reduce((m, c) => {
          m[c] = (m[c] || 0) + 1;
          return m;
        }, {});
        const top = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([c, n]) => `${c}(${n})`)
          .join(", ");

        if (lastAlertFrameRef.current !== wsFrame.frame_index) {
          setDetectionAlert({
            frame: wsFrame.frame_index ?? 0,
            timestamp: wsFrame.timestamp ?? "",
            count: detectionsCount,
            summary: top,
            isGun: gunCount > 0,
            gunCount
          });
          lastAlertFrameRef.current = wsFrame.frame_index ?? 0;
          if (gunCount > 0) {
            const nowTs = Date.now();
            if (nowTs - lastGunSoundAtRef.current > SOUND_COOLDOWN_MS) {
              playGunSound();
              lastGunSoundAtRef.current = nowTs;
            }
          } else {
            // Fallback beep for non-gun detections
            playAlarm();
          }
        }

        setFrameHistory((prev) => {
          const next = [
            ...prev,
            {
              frame_index: wsFrame.frame_index ?? 0,
              timestamp: wsFrame.timestamp ?? "",
              detections: Array.isArray(wsFrame.detections) ? wsFrame.detections : [],
            },
          ];
          // keep last 200 frames to avoid memory growth
          return next.length > 200 ? next.slice(next.length - 200) : next;
        });
      }
    } catch {}
  }, [wsFrame]);

  useEffect(() => {
    if (!wsProgress || typeof wsProgress.progress !== "number") return;
    setProcessingProgress(Math.min(99, wsProgress.progress));
  }, [wsProgress]);

  useEffect(() => {
    if (!wsComplete) return;
    // Build final result video URL
    const apiUrl = 'http://localhost:5000';
    console.log(wsComplete.result_path)
    if (wsComplete.result_path) {
      setResultVideo(`${apiUrl}${wsComplete.result_path}`);
    }
    setProcessingStarted(false);
    setLiveImage(null);
    setResultSource("websocket");
  }, [wsComplete]);

  // Listen for detection results via WebSocket after upload
  useEffect(() => {
    if (!connected) return;
    // console.log(connected, messages, ping, broadcast, join, sendToRoom );
    // Listen for detection result messages for this session
    const handleDetectionMessage = (msg) => {
      try {
        // If backend sends JSON string, parse it
        const data = typeof msg === "string" ? JSON.parse(msg) : msg;
        if (data && data.session_id === sessionId && data.type === "video_detection_result") {
          // Update result and resultVideo
          setResult({
            detections: data.detections || [],
            resultPath: data.result_path,
            duration: data.duration || '00:00:00',
            totalFrames: data.totalFrames || 0,
            processedFrames: data.processedFrames || 0
          });
          setResultSource("websocket");
          if (data.result_path) {
            const apiUrl = 'http://localhost:5000';
            setResultVideo(`${apiUrl}${data.result_path}`);
          }
        }
      } catch (e) {
        // Not a detection message, ignore
      }
    };

    // Attach listener
    if (Array.isArray(messages)) {
      messages.forEach((msg) => handleDetectionMessage(msg));
    }

    // Optionally, you can listen for new messages if useSocket supports event listeners
    // Otherwise, rely on messages array updating

  }, [connected, messages, sessionId]);

/* Removed duplicate useSocket and console.log block */

  // Check if user is logged in
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
    }
  }, [navigate]);

  // Create a preview when a file is selected
  useEffect(() => {
    if (!selectedFile) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

    // Free memory when component unmounts
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    // Validate file type
    if (file && !file.type.startsWith('video/')) {
      setError('Please select a video file (MP4, MOV, etc.)');
      setSelectedFile(null);
      return;
    }

    setError(null);
    setResult(null);
    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select a video file first');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      // Simulate progress while the API call is processing
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return newProgress;
        });
      }, 300);

      // Prepare FormData with video and session_id
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('session_id', sessionId);

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.post(
        `${apiUrl}/api/detect/video`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      clearInterval(progressInterval);
      setProcessingProgress(100);

      // Process the response
      // const detectionResult = {
      //   detections: Object.values(response.data.detections) || [],
      //   resultPath: response.data.result_path,
      //   duration: response.data.duration || '00:00:00',
      //   totalFrames: response.data.totalFrames || 0,
      //   processedFrames: response.data.processedFrames || 0
      // };

      // setResult(detectionResult);
      // setResultSource("rest");

      if (response.data.result_path) {
        setResultVideo(`${apiUrl}${response.data.result_path}`);
      }
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.error || 'Error processing video. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setResultVideo(null);
    setError(null);
    setProcessingProgress(0);
    setProcessingStarted(false);
    setLiveImage(null);
    setLiveMeta({ frame: 0, timestamp: "", detections: 0 });
    // Removed undefined state resets
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (resultVideoRef.current) {
      resultVideoRef.current.pause();
    }
  };

  // Remove frame-by-frame and play/pause logic

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900">Weapon Detection - Video Analysis</h1>
          <p className="mt-3 text-lg text-gray-500">
            Upload a video to detect weapons and dangerous objects.
          </p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            {detectionAlert && (
              <div className="bg-red-50 border-l-8 border-red-600 p-5 mb-6 rounded">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.592c.75 1.335-.213 2.996-1.742 2.996H3.48c-1.53 0-2.492-1.661-1.743-2.996L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V8a1 1 0 112 0v2a1 1 0 01-1 1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-lg font-bold text-red-900">
                      {detectionAlert.isGun ? `GUN DETECTED${detectionAlert.gunCount > 1 ? ` (${detectionAlert.gunCount})` : ''}!` : 'ALERT:'} {detectionAlert.count} detection(s) at frame {detectionAlert.frame} [{detectionAlert.timestamp}]
                    </p>
                    {detectionAlert.summary && (
                      <p className="text-sm text-red-800 mt-1">Classes: {detectionAlert.summary}</p>
                    )}
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setIsMuted(m => !m)}
                        className="px-3 py-1 rounded text-xs font-semibold border bg-white text-gray-700 hover:bg-gray-50"
                        title={isMuted ? 'Alerts are muted' : 'Click to mute alert sound'}
                      >
                        {isMuted ? 'Unmute alert sound' : 'Mute alert sound'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Detection result source indicator */}
            {result && (
              <div className="mb-4">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: resultSource === "websocket" ? "#d1fae5" : "#e0e7ff",
                    color: resultSource === "websocket" ? "#065f46" : "#3730a3"
                  }}>
                  {resultSource === "websocket" ? "Live result from WebSocket" : "Result from REST API"}
                </span>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
              {/* Left: Upload and Video */}
              <div className="md:w-1/2 w-full">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Upload Video
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="video-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                              <span>Upload a file</span>
                              <input
                                id="video-upload"
                                name="video-upload"
                                type="file"
                                className="sr-only"
                                onChange={handleFileChange}
                                accept="video/*"
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            MP4, MOV, AVI, MKV up to 100MB (results will be in WebM format)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Original Video Preview */}
                    {preview && !resultVideo && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preview
                        </label>
                        <div className="border border-gray-300 rounded-md overflow-hidden">
                          <video
                            ref={videoRef}
                            src={preview}
                            controls
                            className="w-full h-96"
                          />
                        </div>
                      </div>
                    )}

                    {/* Upload and progress */}
                    <div className="flex justify-start space-x-3 mt-4">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedFile || isProcessing}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {isProcessing ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                    {/* Progress bar */}
                    {isProcessing && (
                      <div className="w-full mt-4">
                        <div className="h-2 bg-gray-200 rounded">
                          <div
                            className="h-2 bg-indigo-600 rounded"
                            style={{ width: `${processingProgress}%`, transition: 'width 0.3s' }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{processingProgress}%</div>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Right: Live Output */}
              <div className="md:w-1/2 w-full flex flex-col items-center">
                {/* Live Detection Preview (updates during processing) */}
                {processingStarted && (
                  <div className="w-full mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-700">Live Detection Preview</div>
                      <div className="text-xs text-gray-600">
                        Frame {liveMeta.frame} • {liveMeta.timestamp} • {liveMeta.detections} detections • {Math.round(processingProgress)}%
                      </div>
                    </div>
                    <div className="border border-gray-300 rounded overflow-hidden bg-black flex items-center justify-center" style={{ minHeight: 200 }}>
                      {liveImage ? (
                        <img src={liveImage} alt="Live detection" className="w-auto h-96" />
                      ) : (
                        <div className="text-gray-400 text-sm p-4">Waiting for first frame...</div>
                      )}
                    </div>
                  </div>
                )}

                {resultVideo && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Result Video
                        </label>
                        <video
                          ref={resultVideoRef}
                          src={resultVideo}
                          controls
                          className="w-full h-96"
                        />
                      </div>
                    )}

                {/* WebSocket Messages Panel */}
                {/* <div className="w-full mb-4">
                  <div className="bg-gray-100 border border-gray-300 rounded p-2 text-xs h-32 overflow-y-auto">
                    <div className="font-semibold text-gray-700 mb-1">
                      WebSocket Messages {connected ? <span className="text-green-600">(Connected)</span> : <span className="text-red-600">(Disconnected)</span>}
                    </div>
                    {messages.length === 0 ? (
                      <div className="text-gray-400">No messages yet.</div>
                    ) : (
                      messages.map((msg, idx) => (
                        <div key={idx} className="text-gray-800">{msg}</div>
                      ))
                    )}
                  </div>
                </div> */}
                {/* Frame-by-frame detection history (from WebSocket) */}
              </div>
            </div>
{frameHistory.length > 0 && (
                  <div className="w-full mt-4">
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: "#d1fae5",
                          color: "#065f46"
                        }}>
                        Detection History
                      </span>
                    </div>

                    <div className="border border-gray-300 rounded-md p-2">
                      <h4 className="font-semibold mb-2">Recent Frames:</h4>
                      <table className="min-w-full text-xs border">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-2 py-1 text-left w-20">Frame</th>
                            <th className="px-2 py-1 text-left w-28">Timestamp</th>
                            <th className="px-2 py-1 text-left w-20">Count</th>
                            <th className="px-2 py-1 text-left">Classes (top 5)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...frameHistory].slice(-30).reverse().map((f, idx) => {
                            const classes = (f.detections || []).map(d => d.class);
                            // summarize top 5 classes with counts
                            const counts = classes.reduce((m, c) => {
                              m[c] = (m[c] || 0) + 1;
                              return m;
                            }, {});
                            const top = Object.entries(counts)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 5)
                              .map(([c, n]) => `${c}(${n})`)
                              .join(", ");
                            return (
                              <tr key={`${f.frame_index}-${idx}`} className="border-t">
                                <td className="px-2 py-1">{f.frame_index}</td>
                                <td className="px-2 py-1">{f.timestamp}</td>
                                <td className="px-2 py-1">{(f.detections || []).length}</td>
                                <td className="px-2 py-1">{top || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            {/* Frame detection history table at the bottom */}
            {/* (Removed: no frame-by-frame detection in this mode) */}
          </div>
        </div>
      </div>
    </div>
  );
};
export default VideoDetection;
