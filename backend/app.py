import eventlet
eventlet.monkey_patch()

from flask import Flask, jsonify, request
from flask_cors import CORS
from socketio_instance import socketio
import os
from routes.items import items_bp
from routes.auth import auth_bp
from routes.detection import detection_bp
from models import db

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
CORS(app)  # Enable CORS for all routes
socketio.init_app(app)

# Register blueprints
app.register_blueprint(items_bp, url_prefix='/api/items')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(detection_bp, url_prefix='/api/detect')

# Sample routes are now handled by blueprints

@app.route('/')
def index():
    """Root endpoint"""
    return jsonify({
        "message": "Welcome to the Flask API",
        "endpoints": {
            "Items": {
                "GET /api/items": "Get all items",
                "GET /api/items/<id>": "Get a specific item",
                "POST /api/items": "Create a new item",
                "PUT /api/items/<id>": "Update an item",
                "DELETE /api/items/<id>": "Delete an item"
            },
            "Authentication": {
                "POST /api/auth/register": "Register a new user",
                "POST /api/auth/login": "Login a user",
                "GET /api/auth/users": "Get all users (for testing)",
                "GET /api/auth/users/<id>": "Get a specific user"
            },
            "Weapon Detection": {
                "POST /api/detect/image": "Detect weapons in an image",
                "POST /api/detect/video": "Detect weapons in a video"
            }
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, debug=True, host='0.0.0.0', port=port, log_output=False)
