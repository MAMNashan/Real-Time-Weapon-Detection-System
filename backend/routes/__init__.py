# This file makes the routes directory a Python package
from .items import items_bp
from .auth import auth_bp
from .detection import detection_bp

__all__ = ['items_bp', 'auth_bp', 'detection_bp']
