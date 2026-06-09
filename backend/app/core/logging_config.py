"""
Structured logging setup for Suportum.

Format: <timestamp> | <level> | <logger> | <message>
All Socket.IO and HTTP log lines include user= and project= fields where available.
"""
import logging
import sys

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%dT%H:%M:%S"


def setup_logging(level: str = "INFO") -> None:
    """Configure root logger with consistent structured format."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.handlers.clear()
    root.addHandler(handler)
    # Silence third-party noise; suportum.* loggers inherit root level.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("socketio").setLevel(logging.WARNING)
    logging.getLogger("engineio").setLevel(logging.WARNING)
