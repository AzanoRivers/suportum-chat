import socketio

sio = socketio.AsyncServer(
    async_mode="asgi",
    namespaces="*",
    cors_allowed_origins=[],
    logger=False,
    engineio_logger=False,
)
