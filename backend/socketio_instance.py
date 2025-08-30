from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request

socketio = SocketIO(cors_allowed_origins="*", async_mode="eventlet", logger=False, engineio_logger=False)

@socketio.on("connect")
def on_connect():
    print("Client connected", request.sid)
    emit("server_message", {"text": "Welcome!"})  # to the connecting client only

@socketio.on("disconnect")
def on_disconnect():
    print("Client disconnected", request.sid)

@socketio.on("ping_server")
def handle_ping(data):
    # data is a dict from the client
    emit("pong_client", {"text": f"pong: {data.get('text', '')}"})  # reply to same client

@socketio.on("broadcast")
def handle_broadcast(data):
    emit("broadcast_msg", {"text": data.get("text", "")}, broadcast=True)

@socketio.on("join")
def on_join(data):
    room = data.get("room")
    join_room(room)
    emit("server_message", {"text": f"Joined room {room}"})

@socketio.on("room_msg")
def on_room_msg(data):
    room = data.get("room")
    msg = data.get("text", "")
    emit("room_msg", {"text": msg, "room": room}, room=room)
