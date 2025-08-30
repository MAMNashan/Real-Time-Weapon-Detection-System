class Item:
    """
    A simple Item model.
    
    In a real application, this would likely be a SQLAlchemy model
    or another ORM model connected to a database.
    """
    
    def __init__(self, id, name, description=None):
        self.id = id
        self.name = name
        self.description = description
    
    def to_dict(self):
        """Convert the model instance to a dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create a model instance from a dictionary."""
        return cls(
            id=data.get('id'),
            name=data.get('name'),
            description=data.get('description')
        )
