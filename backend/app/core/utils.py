"""
Utilidades generales compartidas por los modulos de la aplicacion.
"""
from datetime import datetime, timezone


def now_iso() -> str:
    """Retorna el timestamp UTC actual en formato ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)."""
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
