"""
Servicio de email via AWS SES.

Uso interno únicamente — no es un endpoint HTTP expuesto.
Solo puede ser invocado desde lógica de backend (endpoints, tareas, etc.).
Las credenciales provienen exclusivamente de variables de entorno.
"""
import asyncio
import logging
from functools import partial
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from jinja2 import Environment

from app.config import settings

logger = logging.getLogger("suportum")

# ── Cliente SES (lazy singleton) ────────────────────────────────────────────

_ses_client = None


def _get_client():
    global _ses_client
    if _ses_client is None:
        _ses_client = boto3.client(
            "ses",
            region_name=settings.AWS_SES_REGION,
            aws_access_key_id=settings.AWS_SES_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SES_SECRET_ACCESS_KEY,
        )
    return _ses_client


def ses_enabled() -> bool:
    """True si las tres variables de SES están configuradas."""
    return bool(
        settings.AWS_SES_ACCESS_KEY_ID
        and settings.AWS_SES_SECRET_ACCESS_KEY
        and settings.AWS_SES_FROM_EMAIL
    )


# ── Envío base ───────────────────────────────────────────────────────────────

def _send_sync(to: str, subject: str, html: str) -> None:
    """Llamada síncrona a SES — se ejecuta en un thread del executor."""
    _get_client().send_email(
        Source=settings.AWS_SES_FROM_EMAIL,
        Destination={"ToAddresses": [to]},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body":    {"Html": {"Data": html,    "Charset": "UTF-8"}},
        },
    )


async def send_email(to: str, subject: str, html: str) -> None:
    """
    Envía un email HTML. Nunca levanta excepción: si SES falla, loguea y continúa.
    Llamar con asyncio.create_task() para fire-and-forget sin bloquear la respuesta.
    """
    if not ses_enabled():
        logger.warning("SES no configurado — email omitido para %s", to)
        return
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, partial(_send_sync, to, subject, html))
        logger.info("Email enviado a %s [%s]", to, subject)
    except (BotoCoreError, ClientError) as exc:
        logger.error("SES error al enviar a %s: %s", to, exc)


# ── Templates ────────────────────────────────────────────────────────────────

_jinja = Environment(autoescape=True)

_STRINGS: dict = {
    "es": {
        "subject":      "Tu cuenta en {project} está lista",
        "greeting":     "¡Hola, {username}!",
        "intro":        "Tu cuenta ha sido creada exitosamente.",
        "label_user":   "USUARIO",
        "label_pass":   "CONTRASEÑA TEMPORAL",
        "warn_title":   "Información confidencial",
        "warn_body":    "No compartas esta contraseña con nadie. Cámbiala al iniciar sesión por primera vez.",
        "footer":       "Powered by AzanoLabs",
    },
    "en": {
        "subject":      "Your account in {project} is ready",
        "greeting":     "Hi, {username}!",
        "intro":        "Your account has been successfully created.",
        "label_user":   "USERNAME",
        "label_pass":   "TEMPORARY PASSWORD",
        "warn_title":   "Confidential information",
        "warn_body":    "Do not share this password with anyone. Change it on your first login.",
        "footer":       "Powered by AzanoLabs",
    },
}

# Tabla-based layout — compatible con Gmail, Outlook Web, Apple Mail, Outlook desktop.
# SVG omitido intencionalmente: Gmail no lo renderiza. Se usa un ícono emoji universalmente soportado.
_WELCOME_TEMPLATE = """\
<!DOCTYPE html>
<html lang="{{ lang }}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ s.greeting|replace("{username}", username) }}</title>
</head>
<body style="margin:0;padding:0;background-color:#030B3A;">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="background-color:#030B3A;padding:48px 16px;">
<tr><td align="center">

  <!-- Card 600px -->
  <table width="600" cellpadding="0" cellspacing="0" border="0"
    style="max-width:600px;width:100%;">

    <!-- Barra de acento superior -->
    <tr>
      <td height="3" style="background-color:#4FC3FF;font-size:0;line-height:0;">&nbsp;</td>
    </tr>

    <!-- Header -->
    <tr>
      <td align="center"
        style="background-color:#0A1E72;padding:36px 40px 28px;
               border-left:1px solid #1a3a9e;border-right:1px solid #1a3a9e;">

        <!-- Ícono -->
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td align="center" valign="middle" width="60" height="60"
              style="width:60px;height:60px;background-color:#4FC3FF;
                     font-size:30px;line-height:60px;text-align:center;">
              &#x1F4AC;
            </td>
          </tr>
        </table>

        <p style="margin:14px 0 0;font-size:10px;font-weight:700;letter-spacing:3px;
                  text-transform:uppercase;color:#4FC3FF;
                  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          SUPORTUM
        </p>

      </td>
    </tr>

    <!-- Cuerpo -->
    <tr>
      <td style="background-color:#071460;padding:36px 40px 32px;
                 border-left:1px solid #1a3a9e;border-right:1px solid #1a3a9e;">

        <!-- Saludo -->
        <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#ffffff;
                   font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                   line-height:1.3;">
          {{ s.greeting|replace("{username}", username) }}
        </h1>

        <!-- Nombre del proyecto + intro -->
        <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.65;
                  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <strong style="color:#ffffff;">{{ project_name }}</strong>
          &mdash; {{ s.intro }}
        </p>

        <!-- Credenciales -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background-color:#030B3A;border:1px solid rgba(79,195,255,0.25);
                 margin-bottom:16px;">
          <tr>
            <td style="padding:24px 28px;">

              <!-- Usuario -->
              <p style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:2px;
                        text-transform:uppercase;color:rgba(255,255,255,0.38);
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                {{ s.label_user }}
              </p>
              <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#4FC3FF;
                        font-family:'Courier New',Courier,monospace;letter-spacing:1px;">
                {{ username }}
              </p>

              <!-- Separador -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td height="1" style="background-color:rgba(255,255,255,0.08);
                                        font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Contraseña -->
              <p style="margin:20px 0 5px;font-size:10px;font-weight:700;letter-spacing:2px;
                        text-transform:uppercase;color:rgba(255,255,255,0.38);
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                {{ s.label_pass }}
              </p>
              <p style="margin:0;font-size:16px;font-weight:600;color:#ffffff;
                        font-family:'Courier New',Courier,monospace;
                        letter-spacing:2px;word-break:break-all;">
                {{ password }}
              </p>

            </td>
          </tr>
        </table>

        <!-- Advertencia -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background-color:rgba(255,90,122,0.08);border:1px solid rgba(255,90,122,0.30);">
          <tr>
            <td style="padding:14px 18px;">
              <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:1px;
                        text-transform:uppercase;color:#FF5A7A;
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                &#9888; {{ s.warn_title }}
              </p>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.72);line-height:1.55;
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                {{ s.warn_body }}
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center"
        style="background-color:#040f3e;padding:18px 40px;
               border:1px solid #1a3a9e;border-top:1px solid rgba(79,195,255,0.1);">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.28);
                  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          {{ project_name }} &middot; Powered by <a href="https://azanolabs.com" style="color:rgba(255,255,255,0.45);text-decoration:none;">AzanoLabs</a>
        </p>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>
"""


def _render_welcome(
    username: str,
    password: str,
    project_name: str,
    lang: str,
) -> str:
    s = _STRINGS.get(lang, _STRINGS["es"])
    tmpl = _jinja.from_string(_WELCOME_TEMPLATE)
    return tmpl.render(
        lang=lang,
        username=username,
        password=password,
        project_name=project_name,
        s=s,
    )


async def send_user_welcome(
    email: str,
    username: str,
    password: str,
    project_name: str,
    lang: str = "es",
) -> None:
    """Envía el correo de bienvenida tras la creación de un usuario."""
    s = _STRINGS.get(lang, _STRINGS["es"])
    subject = s["subject"].replace("{project}", project_name)
    html = _render_welcome(username, password, project_name, lang)
    await send_email(email, subject, html)
