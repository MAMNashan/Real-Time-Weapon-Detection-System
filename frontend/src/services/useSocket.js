// src/useSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "./api";

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  // Expose latest event payloads for consumers (VideoDetection)
  const [wsStarted, setWsStarted] = useState(null);
  const [wsFrame, setWsFrame] = useState(null);
  const [wsProgress, setWsProgress] = useState(null);
  const [wsComplete, setWsComplete] = useState(null);
  const [wsError, setWsError] = useState(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("server_message", (payload) =>
      setMessages((m) => [...m, `server: ${payload.text}`])
    );
    socket.on("pong_client", (p) =>
      setMessages((m) => [...m, `pong: ${p.text}`])
    );
    socket.on("broadcast_msg", (p) =>
      setMessages((m) => [...m, `broadcast: ${p.text}`])
    );
    socket.on("room_msg", (p) =>
      setMessages((m) => [...m, `room(${p.room}): ${p.text}`])
    );

    // Listen for video processing started event
    socket.on("video_processing_started", (payload) => {
      setWsStarted(payload);
      setMessages((m) => [...m, `video_processing_started: ${JSON.stringify(payload)}`]);
      // Optionally, trigger UI updates here
    });

    // Frame-by-frame detections (may be frequent)
    socket.on("frame_detection", (payload) => {
      // Keep full payload available to consumers while logging a summary
      setWsFrame(payload);
      try {
        const summary = {
          frame_index: payload.frame_index,
          timestamp: payload.timestamp,
          detections: Array.isArray(payload.detections) ? payload.detections.length : 0,
        };
        setMessages((m) => [...m, `frame_detection: ${JSON.stringify(summary)}`]);
      } catch (e) {
        setMessages((m) => [...m, `frame_detection(received)`]);
      }
    });

    // Processing complete
    socket.on("video_processing_complete", (payload) => {
      setWsComplete(payload);
      setMessages((m) => [...m, `video_processing_complete: ${JSON.stringify(payload)}`]);
    });

    // Periodic progress updates
    socket.on("video_processing_progress", (payload) => {
      setWsProgress(payload);
      setMessages((m) => [...m, `video_processing_progress: ${JSON.stringify(payload)}`]);
    });

    // Processing error
    socket.on("video_processing_error", (payload) => {
      setWsError(payload);
      setMessages((m) => [...m, `video_processing_error: ${JSON.stringify(payload)}`]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const ping = useCallback((text) => socketRef.current?.emit("ping_server", { text }), []);
  const broadcast = useCallback((text) => socketRef.current?.emit("broadcast", { text }), []);
  const join = useCallback((room) => socketRef.current?.emit("join", { room }), []);
  const sendToRoom = useCallback((room, text) => {
    socketRef.current?.emit("room_msg", { room, text });
  }, []);

  return {
    connected,
    messages,
    ping,
    broadcast,
    join,
    sendToRoom,
    wsStarted,
    wsFrame,
    wsProgress,
    wsComplete,
    wsError,
  };
}
