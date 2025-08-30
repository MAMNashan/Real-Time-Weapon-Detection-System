from flask import Blueprint, jsonify, request, current_app
from models.user import User
from models import db
from utils.helpers import validate_request_data
import jwt
import datetime

# Create a Blueprint for authentication
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()

    # Validate required fields
    is_valid, error_message = validate_request_data(
        data, ['username', 'email', 'password', 'mobile']
    )
    if not is_valid:
        return jsonify({"error": error_message}), 400

    # Check if username already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"error": "Username already exists"}), 400

    # Check if email already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already exists"}), 400

    # Create new user
    new_user = User.from_dict(data, include_password=True)
    db.session.add(new_user)
    db.session.commit()

    return jsonify(new_user.to_dict()), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login a user"""
    data = request.get_json()
    print(data)

    # Validate required fields
    is_valid, error_message = validate_request_data(
        data, ['username', 'password']
    )
    if not is_valid:
        return jsonify({"error": error_message}), 400

    # Find user by username
    user = User.query.filter_by(username=data['username']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({"error": "Invalid username or password"}), 401

    # Generate JWT token
    secret = str(current_app.config.get("SECRET_KEY", "supersecretkey"))
    exp = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    token = jwt.encode(
        {"user_id": user.id, "exp": int(exp.timestamp())},
        secret,
        algorithm="HS256"
    )

    return jsonify({"user": user.to_dict(), "token": token})

@auth_bp.route('/users', methods=['GET'])
def get_users():
    """Get all users (for testing purposes)"""
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@auth_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get a specific user by ID"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(user.to_dict())
