from flask import Blueprint, jsonify, request, send_file, url_for
from werkzeug.utils import secure_filename
import os
import time
import uuid
import cv2
import numpy as np
import time
from ultralytics import YOLO
from PIL import Image
import io
import torch
import requests
import base64
import threading
from config import (
    IMAGE_UPLOAD_FOLDER, VIDEO_UPLOAD_FOLDER,
    IMAGE_RESULT_FOLDER, VIDEO_RESULT_FOLDER,
    ALLOWED_IMAGE_EXTENSIONS, ALLOWED_VIDEO_EXTENSIONS
)
from socketio_instance import socketio

# Create a Blueprint for detection
detection_bp = Blueprint('detection', __name__)


# Routes to serve processed files
@detection_bp.route('/results/image/<filename>', methods=['GET'])
def serve_image_result(filename):
    """Serve a processed image result"""
    try:
        return send_file(os.path.join(IMAGE_RESULT_FOLDER, filename), mimetype='image/jpeg', conditional=True)
    except Exception as e:
        return jsonify({"error": f"Error serving image: {str(e)}"}), 404

@detection_bp.route('/results/video/<filename>', methods=['GET'])
def serve_video_result(filename):
    """Serve a processed video result"""
    try:
        # Get the actual path to the processed video
        # YOLOv8 saves videos in a subdirectory with the name specified
        video_name = filename.split('.')[0]

        # Check for WebM file first (new format)
        webm_filename = f"{video_name}.webm"
        webm_path = os.path.join(VIDEO_RESULT_FOLDER, video_name, webm_filename)

        # If WebM doesn't exist, try the original filename
        if not os.path.exists(webm_path):
            video_path = os.path.join(VIDEO_RESULT_FOLDER, video_name, filename)
            # If that doesn't exist, try the direct path
            if not os.path.exists(video_path):
                video_path = os.path.join(VIDEO_RESULT_FOLDER, filename)
        else:
            video_path = webm_path
            filename = webm_filename

        # Determine the correct mimetype based on file extension
        if filename.endswith('.webm'):
            mimetype = 'video/webm'
        elif filename.endswith('.mp4'):
            mimetype = 'video/mp4'
        elif filename.endswith('.avi'):
            mimetype = 'video/x-msvideo'
        else:
            mimetype = 'video/mp4'  # Default

        return send_file(video_path, mimetype=mimetype, conditional=True)
    except Exception as e:
        return jsonify({"error": f"Error serving video: {str(e)}"}), 404

# Load YOLOv8 model
model = YOLO('july29_5th_train.pt')  # Using the nano model for speed, can be changed to larger models for better accuracy

def allowed_image_file(filename):
    """Check if the uploaded file has an allowed image extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def allowed_video_file(filename):
    """Check if the uploaded file has an allowed video extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

@detection_bp.route('/image', methods=['POST'])
def detect_image():
    """Detect people in an uploaded image using YOLOv8"""
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({"error": "No image selected"}), 400

    if not allowed_image_file(file.filename):
        return jsonify({"error": "File type not allowed. Please upload an image file (png, jpg, jpeg, gif)"}), 400

    try:
        # Get timestamp from form (optional)
        timestamp = time.time()
        if timestamp is None:
            timestamp = 0

        # Secure the filename and generate a unique name
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(IMAGE_UPLOAD_FOLDER, unique_filename)

        # Save the uploaded file
        file.save(file_path)

        # Process the image with YOLOv8
        results = model(file_path)

        # Create a list to store detection results
        detections = []

        # Process detection results
        if len(results) > 0:
            result = results[0]  # Get the first result

            # Save the annotated image
            result_filename = f"result_{unique_filename}"
            result_path = os.path.join(IMAGE_RESULT_FOLDER, result_filename)

            # Save the result image with annotations
            result.save(result_path)

            # Extract detection information
            for box in result.boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                # Get confidence score
                confidence = box.conf[0].item()

                # Get class name
                class_id = int(box.cls[0].item())
                class_name = result.names[class_id]

                detections.append({
                    "class": class_name,
                    "confidence": round(confidence, 2),
                    "bbox": [round(x1), round(y1), round(x2), round(y2)],
                    "timestamp": timestamp
                })

        # Return detection results with the path to the annotated image
        return jsonify({
            "success": True,
            "filename": unique_filename,
            "result_filename": result_filename,
            "result_path": f"/api/detect/results/image/{result_filename}",
            "detections": detections,
            "message": f"Detected {len(detections)} people"
        })

    except Exception as e:
        return jsonify({"error": f"Error processing image: {str(e)}"}), 500

@detection_bp.route('/video', methods=['POST'])
def detect_video():
    """Detect people in an uploaded video using YOLOv8 frame by frame with tracking and send per-frame results to a webhook"""
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    file = request.files['video']

    if file.filename == '':
        return jsonify({"error": "No video selected"}), 400

    if not allowed_video_file(file.filename):
        return jsonify({"error": "File type not allowed. Please upload a video file (mp4, avi, mov, mkv)"}), 400

    # Get session_id from form or JSON for WebSocket room
    session_id = request.form.get('session_id')
    if not session_id and request.is_json:
        session_id = request.json.get('session_id')
    if not session_id:
        return jsonify({"error": "No session_id provided for WebSocket communication"}), 400

    try:
        # Secure the filename and generate a unique name
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(VIDEO_UPLOAD_FOLDER, unique_filename)

        # Save the uploaded file
        file.save(file_path)

        # Create result directory
        result_filename = f"result_{unique_filename}"
        result_dir = os.path.join(VIDEO_RESULT_FOLDER, result_filename.split('.')[0])
        os.makedirs(result_dir, exist_ok=True)
        socketio.emit(
            "video_processing_started",
            {
                "filename": unique_filename,
                "result_filename": f"{result_filename.split('.')[0]}.webm",
                "session_id": session_id,
                "message": "Video processing has started."
            },
            room=session_id
        )
        # Start background task for processing (SocketIO-managed for real-time emits)
        socketio.start_background_task(
            process_video_detection,
            file_path, result_filename, result_dir, session_id, unique_filename
        )

        # Emit WebSocket message: processing started


        # Immediately return success response
        return jsonify({
            "success": True,
            "filename": unique_filename,
            "result_filename": f"{result_filename.split('.')[0]}.webm",
            "message": "Video uploaded successfully. Processing started."
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error uploading video: {str(e)}"}), 500

def process_video_detection(file_path, result_filename, result_dir, session_id, unique_filename):
    """Background video detection logic for YOLOv8 video processing."""
    try:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Using device: {device}")

        cap = cv2.VideoCapture(file_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        if not fps or fps <= 1:
            fps = 25.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_seconds = frame_count / fps if fps else 0
        minutes = int(duration_seconds // 60)
        seconds = int(duration_seconds % 60)
        duration = f"00:{minutes:02d}:{seconds:02d}"

        webm_output_path = os.path.join(result_dir, f"{result_filename.split('.')[0]}.webm")
        fourcc = cv2.VideoWriter_fourcc(*'VP90')
        out = cv2.VideoWriter(webm_output_path, fourcc, fps, (width, height))

        unique_tracks = {}
        frame_idx = 0
        processed_frames = 0

        print(f"Processing video: {frame_count} frames at {fps} FPS")
        target_size = 480
        frame_skip_interval = 2
        time.sleep(1)
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                break
            # Enforce constant frame size and dtype to avoid optical flow size mismatches
            if frame.shape[1] != width or frame.shape[0] != height:
                frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_LINEAR)
            if frame.dtype != np.uint8:
                frame = frame.astype(np.uint8)
            original_frame = frame.copy()
            frame_idx += 1
            if (frame_idx % frame_skip_interval) != 0:
                continue
            try:
                # Ensure contiguous memory to avoid OpenCV optical flow size/assert issues
                frame_for_infer = np.ascontiguousarray(frame)
                results = model.track(
                    source=frame_for_infer,
                    device=device,
                    conf=0.6,
                    imgsz=target_size,
                    persist=True,
                    tracker="bytetrack.yaml",  # force ByteTrack (avoids optical flow size mismatch)
                    verbose=False
                )
            except Exception as track_err:
                print(f"Tracking error on frame {frame_idx}: {track_err}")
                results = None
            frame_detections = []
            # Compute timestamp once per frame so it is always defined
            frame_time = frame_idx / fps if fps else 0
            frame_minutes = int(frame_time // 60)
            frame_seconds = int(frame_time % 60)
            timestamp = f"00:{frame_minutes:02d}:{frame_seconds:02d}"
            if results is not None and len(results) > 0:
                result = results[0]
                # annotated_frame = original_frame.copy()
                annotated_frame = results[0].plot()
                if result.boxes is not None:
                    for box in result.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        confidence = box.conf[0].item()
                        class_id = int(box.cls[0].item())
                        class_name = result.names[class_id]
                        track_id = None
                        if hasattr(box, 'id') and box.id is not None:
                            track_id = int(box.id[0].item())
                        # cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                        if track_id is not None:
                            label = f"{class_name} ID:{track_id}: {confidence:.2f}"
                        else:
                            label = f"{class_name}: {confidence:.2f}"
                            label += " [P]"
                        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                        # cv2.rectangle(annotated_frame, (int(x1), int(y1) - label_size[1] - 10),
                        #             (int(x1) + label_size[0], int(y1)), (0, 255, 0), -1)
                        # cv2.putText(annotated_frame, label, (int(x1), int(y1) - 5),
                        #           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
                        if track_id is not None:
                            if track_id not in unique_tracks:
                                unique_tracks[track_id] = {
                                    "track_id": track_id,
                                    "class": class_name,
                                    "first_seen_frame": frame_idx,
                                    "first_seen_timestamp": timestamp,
                                    "last_seen_frame": frame_idx,
                                    "last_seen_timestamp": timestamp,
                                    "max_confidence": round(confidence, 2),
                                    "detection_count": 1,
                                    "bbox_history": [[int(x1), int(y1), int(x2), int(y2)]]
                                }
                            else:
                                unique_tracks[track_id]["last_seen_frame"] = frame_idx
                                unique_tracks[track_id]["last_seen_timestamp"] = timestamp
                                unique_tracks[track_id]["max_confidence"] = max(
                                    unique_tracks[track_id]["max_confidence"],
                                    round(confidence, 2)
                                )
                                unique_tracks[track_id]["detection_count"] += 1
                                unique_tracks[track_id]["bbox_history"].append([int(x1), int(y1), int(x2), int(y2)])
                                if len(unique_tracks[track_id]["bbox_history"]) > 5:
                                    unique_tracks[track_id]["bbox_history"] = unique_tracks[track_id]["bbox_history"][-5:]
                        frame_detections.append({
                            "class": class_name,
                            "confidence": round(confidence, 2),
                            "bbox": [round(x1), round(y1), round(x2), round(y2)],
                            "track_id": track_id,
                            "timestamp": timestamp,
                            "frame": frame_idx
                        })
                out.write(annotated_frame)
                _, buffer = cv2.imencode('.jpg', annotated_frame)
                jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                payload = {
                    "frame_index": frame_idx,
                    "timestamp": timestamp,
                    "image_base64": jpg_as_text,
                    "detections": frame_detections
                }
                socketio.emit("frame_detection", payload, room=session_id)
                try:
                    # Yield to the event loop to flush the message to clients
                    socketio.sleep(0)
                except Exception:
                    pass
            else:
                out.write(original_frame)
            processed_frames += 1
            if frame_idx % 30 == 0:
                progress = (frame_idx / frame_count) * 100 if frame_count else 0
                actual_processed = (frame_idx // frame_skip_interval) + (1 if frame_idx % frame_skip_interval > 0 else 0)
                print(f"Processing progress: {progress:.1f}% ({frame_idx}/{frame_count} frames, {actual_processed} processed)")
                try:
                    socketio.emit("video_processing_progress", {
                        "progress": round(progress, 1),
                        "frame_index": frame_idx,
                        "processedFrames": processed_frames,
                        "totalFrames": frame_count,
                        "session_id": session_id
                    }, room=session_id)
                    # Yield to ensure progress event is delivered promptly
                    socketio.sleep(0)
                except Exception as _:
                    pass
        cap.release()
        out.release()
        print(f"Video processing completed. Processed {processed_frames} frames.")
        print(f"Total unique tracks found: {len(unique_tracks)}")
        if not os.path.exists(webm_output_path):
            raise Exception("Failed to create output video file")
        file_size = os.path.getsize(webm_output_path)
        print(f"Output video size: {file_size / (1024*1024):.2f} MB")
        socketio.emit("video_processing_complete", {
            "filename": unique_filename,
            "result_filename": f"{result_filename.split('.')[0]}.webm",
            "result_path": f"/api/detect/results/video/{result_filename.split('.')[0]}.webm",
            "uniqueTracks": len(unique_tracks),
            "message": f"Processing complete. {len(unique_tracks)} unique tracks detected.",
            "session_id": session_id
        }, room=session_id)
    except Exception as e:
        print(f"Error in background video processing: {str(e)}")
        try:
            if 'cap' in locals():
                cap.release()
            if 'out' in locals():
                out.release()
        except:
            pass
        try:
            socketio.emit("video_processing_error", {
                "filename": unique_filename,
                "error": str(e)
            }, room=session_id)
        except:
            pass
