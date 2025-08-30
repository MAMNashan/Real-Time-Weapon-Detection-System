import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Define paths for uploads and results
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
RESULT_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'results')
IMAGE_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'images')
VIDEO_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'videos')
IMAGE_RESULT_FOLDER = os.path.join(RESULT_FOLDER, 'images')
VIDEO_RESULT_FOLDER = os.path.join(RESULT_FOLDER, 'videos')

# Ensure directories exist
for directory in [IMAGE_UPLOAD_FOLDER, VIDEO_UPLOAD_FOLDER, IMAGE_RESULT_FOLDER, VIDEO_RESULT_FOLDER]:
    os.makedirs(directory, exist_ok=True)

# Allowed file extensions
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-please-change-in-production')
    DEBUG = False
    TESTING = False
    UPLOAD_FOLDER = UPLOAD_FOLDER
    RESULT_FOLDER = RESULT_FOLDER
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max upload size

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration."""
    # Production-specific settings
    DEBUG = False

# Dictionary with different configuration environments
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
