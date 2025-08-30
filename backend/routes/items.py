from flask import Blueprint, jsonify, request
from models.item import Item

# Create a Blueprint for items
items_bp = Blueprint('items', __name__)

# Sample data - in a real app, this would come from a database
items_data = [
    {"id": 1, "name": "Item 1", "description": "Description for item 1"},
    {"id": 2, "name": "Item 2", "description": "Description for item 2"},
    {"id": 3, "name": "Item 3", "description": "Description for item 3"}
]

# Convert to Item objects
items = [Item.from_dict(item) for item in items_data]

@items_bp.route('/', methods=['GET'])
def get_items():
    """Get all items"""
    return jsonify([item.to_dict() for item in items])

@items_bp.route('/<int:item_id>', methods=['GET'])
def get_item(item_id):
    """Get a specific item by ID"""
    item = next((item for item in items if item.id == item_id), None)
    if item:
        return jsonify(item.to_dict())
    return jsonify({"error": "Item not found"}), 404

@items_bp.route('/', methods=['POST'])
def create_item():
    """Create a new item"""
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({"error": "Invalid data"}), 400
    
    new_id = max(item.id for item in items) + 1 if items else 1
    new_item = Item(id=new_id, name=data["name"], description=data.get("description"))
    items.append(new_item)
    return jsonify(new_item.to_dict()), 201

@items_bp.route('/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    """Update an existing item"""
    item = next((item for item in items if item.id == item_id), None)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid data"}), 400
    
    if 'name' in data:
        item.name = data['name']
    if 'description' in data:
        item.description = data['description']
    
    return jsonify(item.to_dict())

@items_bp.route('/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete an item"""
    global items
    initial_count = len(items)
    items = [item for item in items if item.id != item_id]
    
    if len(items) == initial_count:
        return jsonify({"error": "Item not found"}), 404
    
    return jsonify({"message": "Item deleted"})
