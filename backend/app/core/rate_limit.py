import time
from typing import Dict, List

_buckets: Dict[str, List[float]] = {}


def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    now = time.monotonic()
    cutoff = now - window_seconds
    recent = [t for t in _buckets.get(key, []) if t > cutoff]
    if len(recent) >= max_requests:
        _buckets[key] = recent
        return False
    recent.append(now)
    _buckets[key] = recent
    return True


def is_rate_limited(key: str, max_requests: int, window_seconds: int) -> bool:
    """Chequeo de solo lectura: True si ya esta en el limite. No registra ningun
    intento nuevo (para poder decidir 'ya esta bloqueado' antes de saber si el
    intento actual va a fallar o no)."""
    now = time.monotonic()
    cutoff = now - window_seconds
    recent = [t for t in _buckets.get(key, []) if t > cutoff]
    _buckets[key] = recent
    return len(recent) >= max_requests


def record_attempt(key: str) -> None:
    """Registra un intento fallido contra key (append timestamp), sin chequear limite."""
    _buckets.setdefault(key, []).append(time.monotonic())


def evict_stale_buckets(window_seconds: int) -> None:
    """Elimina keys cuyo ultimo timestamp ya vencio. Llamar periodicamente."""
    cutoff = time.monotonic() - window_seconds
    stale = [k for k, v in _buckets.items() if not v or v[-1] <= cutoff]
    for k in stale:
        del _buckets[k]
