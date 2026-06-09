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


def evict_stale_buckets(window_seconds: int) -> None:
    """Elimina keys cuyo ultimo timestamp ya vencio. Llamar periodicamente."""
    cutoff = time.monotonic() - window_seconds
    stale = [k for k, v in _buckets.items() if not v or v[-1] <= cutoff]
    for k in stale:
        del _buckets[k]
