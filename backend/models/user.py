from werkzeug.security import generate_password_hash, check_password_hash
from . import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    mobile = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        """Set the password hash from a plain text password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if the provided password matches the stored hash."""
        if self.password_hash is None:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert the model instance to a dictionary."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'mobile': self.mobile
        }

    @classmethod
    def from_dict(cls, data, include_password=False):
        """Create a model instance from a dictionary."""
        user = cls(
            username=data.get('username'),
            email=data.get('email'),
            mobile=data.get('mobile')
        )
        if include_password and 'password' in data:
            user.set_password(data['password'])
        return user
