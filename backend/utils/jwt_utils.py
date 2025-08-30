import jwt
from flask import current_app
from jwt import ExpiredSignatureError, InvalidTokenError

def decode_token(token):
    """
    Decodes a JWT token and returns the payload if valid.
    Raises ExpiredSignatureError or InvalidTokenError if invalid/expired.
    """
    secret = current_app.config.get("SECRET_KEY", "supersecretkey")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except ExpiredSignatureError:
        raise
    except InvalidTokenError:
        raise
