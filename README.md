# Weapon Detection Application

This project consists of a React.js frontend with Tailwind CSS and a Flask API backend with user authentication and YOLOv8-powered weapon detection capabilities.

## Project Structure

```
.
├── frontend/            # React.js with Tailwind CSS frontend
│   ├── public/          # Public assets
│   ├── src/             # Source code
│   │   ├── components/  # React components
│   │   └── ...
│   ├── package.json     # NPM dependencies
│   └── ...
└── backend/             # Flask API backend
    ├── models/          # Data models
    ├── routes/          # API routes
    ├── utils/           # Utility functions
    ├── app.py           # Main application file
    ├── config.py        # Configuration
    └── requirements.txt # Python dependencies
```

## Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. The frontend will be available at http://localhost:3000

## Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment (optional but recommended):
   ```
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Install FFmpeg (required for video conversion to WebM format):
   - **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
   - **macOS**: `brew install ffmpeg`
   - **Windows**: Download from [FFmpeg.org](https://ffmpeg.org/download.html) and add to PATH

4. Run the Flask application:
   ```
   flask run
   ```
   or
   ```
   python3 app.py
   ```

5. The API will be available at http://localhost:5000

## API Endpoints

### Items
- `GET /api/items` - Get all items
- `GET /api/items/<id>` - Get a specific item
- `POST /api/items` - Create a new item
- `PUT /api/items/<id>` - Update an item
- `DELETE /api/items/<id>` - Delete an item

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/users` - Get all users (for testing)
- `GET /api/auth/users/<id>` - Get a specific user

### Weapon Detection
- `POST /api/detect/image` - Detect weapons in an uploaded image using YOLOv8
- `POST /api/detect/video` - Detect weapons in an uploaded video using YOLOv8
- `GET /api/detect/results/image/<filename>` - Get a processed image with annotations
- `GET /api/detect/results/video/<filename>` - Get a processed video with annotations

## Development

- Frontend: The React application uses Tailwind CSS for styling and includes:
  - User authentication (login/register)
  - Home page with navigation
  - Protected routes
  - Responsive design
  - Image upload and detection
  - Video upload and detection
  - Real-time detection visualization

- Backend: The Flask API provides RESTful endpoints for the frontend, including:
  - User authentication
  - Item management
  - Weapon detection in images and videos using YOLOv8
  - CORS support for cross-origin requests

## Features

### Weapon Detection with YOLOv8
The application provides two main detection features:

1. **Image Detection**
   - Upload images to detect Weapon using YOLOv8
   - View annotated results with bounding boxes
   - See confidence scores for each detection
   - Reset and try different images
   - Display the processed image with annotations

2. **Video Detection**
   - Upload videos to detect Weapon using YOLOv8
   - Track processing progress in real-time
   - View detection results with timestamps
   - Jump to specific detection points in the video
   - See confidence scores for each detection
   - Play the processed video with annotations (in WebM format)

### Authentication
- User registration with validation
- Secure login
- Protected routes that require authentication
- User profile management

## Video Format

The application uses WebM format for processed videos, which offers several advantages:

1. **Web Compatibility**: WebM is specifically designed for the web and is natively supported by all modern browsers without plugins.

2. **Efficient Compression**: WebM provides excellent video quality at smaller file sizes compared to formats like MP4 or AVI, making it faster to load and stream.

3. **Open Format**: WebM is an open, royalty-free format developed by Google, ensuring it remains accessible for all users.

4. **HTML5 Integration**: WebM works seamlessly with HTML5 video elements, making it ideal for web applications.

The system automatically converts uploaded videos (MP4, AVI, MOV, MKV) to WebM format during the detection process, ensuring optimal performance and compatibility.


