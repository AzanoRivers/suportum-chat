"""
Extraccion del dominio (hostname) del origen de un request HTTP.

Se usa para bindear cada proyecto al primer dominio desde el que se usa su
api_key, y para detectar el uso de una key copiada desde otro sitio.
"""
from typing import Optional
from urllib.parse import urlparse

from fastapi import Request


def extract_request_domain(request: Request) -> Optional[str]:
    """
    Extrae el hostname (sin protocolo ni puerto) del header Origin o, si no
    esta presente, del header Referer. Nunca usa el header Host, ya que ese
    es el host del backend, no el del sitio que embebe el widget.

    Retorna None si no hay ninguno de los dos headers, o si el valor no se
    puede parsear a un hostname valido. El llamador debe tratar None como
    "dominio no resoluble" (fail closed), nunca asumir que equivale a un
    match valido.
    """
    origin = request.headers.get("origin") or request.headers.get("referer")
    if not origin:
        return None
    return urlparse(origin).hostname
