from fastapi.responses import HTMLResponse

_GUIDE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Suportum API - Guide</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0a0a0f; color: #c9d1d9; line-height: 1.6;
    }
    a { color: #00d4ff; text-decoration: none; }
    a:hover { text-decoration: underline; }

    .header {
      background: linear-gradient(135deg, #111118 0%, #0a0a0f 100%);
      border-bottom: 1px solid #1e1e2e;
      padding: 2.5rem 2rem 2rem;
      text-align: center;
    }
    .header h1 { font-size: 2rem; color: #e8e8f0; letter-spacing: -0.5px; }
    .header p  { margin-top: 0.4rem; color: #8888a8; font-size: 0.95rem; }
    .header-links {
      margin-top: 1rem;
      display: flex; gap: 1.2rem; justify-content: center; flex-wrap: wrap;
    }
    .header-links a {
      color: #8888a8; font-size: 0.8rem; text-decoration: none;
      display: flex; align-items: center; gap: 0.3rem;
      transition: color 0.15s;
    }
    .header-links a:hover { color: #00d4ff; }
    .badge {
      display: inline-block; margin-top: 0.8rem;
      background: #003d52; color: #00d4ff; font-size: 0.75rem;
      padding: 0.2rem 0.7rem; border-radius: 20px; font-weight: 600;
      border: 1px solid #00d4ff44;
    }

    .container { max-width: 860px; margin: 0 auto; padding: 2rem 1rem 4rem; }

    .lang-picker {
      display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
      margin-bottom: 2.5rem;
    }
    .lang-card {
      display: flex; align-items: center; gap: 0.75rem;
      background: #111118; border: 2px solid #1e1e2e; border-radius: 12px;
      padding: 0.9rem 1.5rem; cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      user-select: none; flex: 1 1 140px; max-width: 220px;
    }
    .lang-card:hover { border-color: #00d4ff; background: #14141e; }
    .lang-card.active {
      border-color: #00d4ff; background: #14141e;
      box-shadow: 0 0 0 3px rgba(0,212,255,.12);
    }
    .lang-card .flag  { font-size: 1.8rem; line-height: 1; }
    .lang-card .label { display: flex; flex-direction: column; }
    .lang-card .label strong { font-size: 0.95rem; color: #e8e8f0; }
    .lang-card .label span   { font-size: 0.75rem; color: #8888a8; }

    .lang-content         { display: none; }
    .lang-content.visible { display: block; }

    .toc {
      background: #111118; border: 1px solid #1e1e2e; border-radius: 8px;
      padding: 1.25rem 1.5rem; margin-bottom: 2.5rem;
    }
    .toc h2 {
      font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;
      color: #8888a8; margin-bottom: 0.75rem;
    }
    .toc ol { padding-left: 1.25rem; }
    .toc li { margin: 0.25rem 0; font-size: 0.9rem; }

    section { margin-bottom: 2.5rem; }
    h2 {
      font-size: 1.2rem; color: #e8e8f0;
      border-bottom: 1px solid #1a1a24;
      padding-bottom: 0.4rem; margin-bottom: 1rem;
    }
    h3 { font-size: 1rem; color: #c8c8e0; margin: 1.25rem 0 0.5rem; }
    p, li { font-size: 0.9rem; color: #c9d1d9; }
    ul, ol { padding-left: 1.25rem; margin-top: 0.4rem; }
    li { margin: 0.2rem 0; }

    code {
      background: #111118; border: 1px solid #1e1e2e;
      border-radius: 4px; padding: 0.1rem 0.4rem;
      font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.82rem;
      color: #e6edf3; word-break: break-word;
    }
    pre {
      background: #111118; border: 1px solid #1e1e2e; border-radius: 8px;
      padding: 1rem 1.25rem; overflow-x: auto; margin-top: 0.75rem;
    }
    pre code {
      background: none; border: none; padding: 0; word-break: normal;
      font-size: 0.82rem; color: #e6edf3; line-height: 1.7;
    }

    .endpoint {
      background: #111118; border: 1px solid #1e1e2e; border-radius: 8px;
      padding: 1rem 1.25rem; margin-bottom: 1rem;
    }
    .endpoint-header {
      display: flex; align-items: center; flex-wrap: wrap; gap: 0.4rem;
    }
    .method {
      display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px;
      font-size: 0.75rem; font-weight: 700; margin-right: 0.25rem;
      font-family: monospace; white-space: nowrap;
    }
    .get    { background: #0e3a20; color: #3fb950; }
    .post   { background: #001a33; color: #00d4ff; }
    .patch  { background: #2d1a00; color: #f0883e; }
    .delete { background: #3a1010; color: #ff7b72; }
    .path { font-family: monospace; font-size: 0.85rem; color: #e8e8f0; word-break: break-all; }
    .auth-badge {
      margin-left: auto; font-size: 0.72rem; padding: 0.15rem 0.5rem;
      border-radius: 12px; border: 1px solid #1e1e2e; color: #8888a8;
      white-space: nowrap;
    }
    .auth-badge.required { border-color: #00d4ff44; color: #00d4ff; }
    .auth-badge.admin    { border-color: #f0883e66; color: #f0883e; }

    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 0.75rem; }
    table {
      width: 100%; border-collapse: collapse; font-size: 0.85rem;
      min-width: 400px;
    }
    th {
      background: #111118; color: #8888a8; text-align: left;
      padding: 0.5rem 0.75rem; border-bottom: 1px solid #1e1e2e;
      font-weight: 600; font-size: 0.78rem; text-transform: uppercase;
      white-space: nowrap;
    }
    td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #14141e; }
    tr:last-child td { border-bottom: none; }
    td code { font-size: 0.78rem; }

    .note {
      background: #001a33; border-left: 3px solid #00d4ff;
      border-radius: 0 6px 6px 0;
      padding: 0.75rem 1rem; font-size: 0.85rem; margin-top: 0.75rem;
    }

    .role-pill {
      display: inline-block; font-size: 0.7rem; padding: 0.1rem 0.45rem;
      border-radius: 10px; font-family: monospace; font-weight: 600;
      margin-right: 0.2rem;
    }
    .role-client { background: #1a2d1a; color: #3fb950; }
    .role-agent  { background: #001a2d; color: #00d4ff; }
    .role-admin  { background: #2d1a00; color: #f0883e; }

    @media (max-width: 600px) {
      .header h1 { font-size: 1.4rem; }
      .container { padding: 1.25rem 0.75rem 3rem; }
      .lang-card { padding: 0.75rem 1rem; flex: 1 1 100%; max-width: 100%; }
      .lang-picker { flex-direction: column; align-items: stretch; }
      .endpoint-header { gap: 0.3rem; }
      .auth-badge { margin-left: 0; }
      pre { padding: 0.75rem; }
      th, td { padding: 0.4rem 0.5rem; font-size: 0.78rem; }
    }
  </style>
</head>
<body>

<div class="header">
  <h1>&#x1F4AC; Suportum API</h1>
  <p>Real-time support platform &middot; REST + Socket.IO reference</p>
  <span class="badge">v1</span>
  <div class="header-links">
    <a href="https://www.azanolabs.com/suportum" target="_blank" rel="noopener">&#x1F4E6; Product page</a>
    <a href="https://github.com/azanoRivers" target="_blank" rel="noopener">&#x1F4BB; GitHub</a>
    <a href="/guide-ai" rel="noopener">&#x1F916; AI-readable guide</a>
  </div>
</div>

<div class="container">

  <div class="lang-picker">
    <div class="lang-card active" onclick="switchLang('en', this)">
      <span class="flag">&#x1F1FA;&#x1F1F8;</span>
      <div class="label">
        <strong>English</strong>
        <span>Documentation in English</span>
      </div>
    </div>
    <div class="lang-card" onclick="switchLang('es', this)">
      <span class="flag">&#x1F1EA;&#x1F1F8;</span>
      <div class="label">
        <strong>Espa&ntilde;ol</strong>
        <span>Documentaci&oacute;n en espa&ntilde;ol</span>
      </div>
    </div>
  </div>

  <!-- ==================== ENGLISH ==================== -->
  <div id="lang-en" class="lang-content visible">

    <div class="toc">
      <h2>Contents</h2>
      <ol>
        <li><a href="#en-overview">Overview</a></li>
        <li><a href="#en-auth">Authentication</a></li>
        <li><a href="#en-setup">Setup endpoints</a></li>
        <li><a href="#en-auth-endpoints">Auth endpoints</a></li>
        <li><a href="#en-messages">Messages</a></li>
        <li><a href="#en-tickets">Tickets</a></li>
        <li><a href="#en-orders">Orders</a></li>
        <li><a href="#en-users">Users</a></li>
        <li><a href="#en-upload">Upload</a></li>
        <li><a href="#en-projects">Projects</a></li>
        <li><a href="#en-socketio">Socket.IO events</a></li>
        <li><a href="#en-errors">Error codes</a></li>
      </ol>
    </div>

    <section id="en-overview">
      <h2>Overview</h2>
      <p>Suportum is a multi-tenant real-time support platform. A single backend instance serves multiple independent <strong>projects</strong>. Each project has its own users, messages, tickets, and orders isolated by <code>project_id</code>.</p>
      <h3>Roles</h3>
      <ul>
        <li><span class="role-pill role-client">client</span> End user. Can chat, create tickets, and track their own orders.</li>
        <li><span class="role-pill role-agent">agent</span> Support staff. Can respond to chats, manage assigned tickets, and work the order board.</li>
        <li><span class="role-pill role-admin">admin</span> Project administrator. Full access: users, settings, all tickets and orders.</li>
      </ul>
      <h3>Base URL</h3>
      <pre><code>https://chat.azanolabs.com</code></pre>
    </section>

    <section id="en-auth">
      <h2>Authentication</h2>
      <p>Most endpoints require a short-lived <strong>JWT access token</strong> obtained via <code>POST /api/v1/auth/login</code> or <code>POST /api/v1/auth/register</code>.</p>
      <pre><code>Authorization: Bearer &lt;access_token&gt;</code></pre>
      <p>Access tokens expire after 15 minutes. Use the refresh endpoint to renew without re-login.</p>
      <h3>Project API key</h3>
      <p>Login and register endpoints require the project <code>api_key</code> in the request body. This identifies which project the user belongs to. The API key is a <strong>public project identifier</strong>, not a secret: it is safe to embed it in client-side code. Data access always requires valid user credentials on top of it.</p>
      <h3>Socket.IO namespace</h3>
      <p>The Socket.IO connection uses the <code>api_key</code> as the namespace:</p>
      <pre><code>io("https://chat.azanolabs.com/&lt;api_key&gt;", {
  auth: { token: "&lt;access_token&gt;" },
  transports: ["websocket"]
})</code></pre>
      <p>Public endpoints (no auth required): <code>GET /guide</code>, <code>GET /guide-ai</code>, <code>GET /api/v1/setup/health</code>, <code>GET /api/v1/setup/branding</code>, <code>GET /api/v1/setup/check-slug/{slug}</code>.</p>
    </section>

    <section id="en-setup">
      <h2>Setup endpoints</h2>
      <p>Used by the widget wizard on first installation. Rate-limited to 3 project creations per IP per 24 hours.</p>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/setup</span>
          <span class="auth-badge">public</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Create a new project. Returns the <code>api_key</code> used in all subsequent requests.</p>
        <pre><code>{
  "name": "My Support Project",
  "admin_email": "admin@example.com",
  "admin_username": "admin",
  "admin_password": "min8chars",
  "language": "en",          // "en" | "es"
  "slug": "my-project",      // optional, auto-generated from name if absent
  "logo_data": "data:image/png;base64,..."  // optional
}</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem">Response: <code>{ api_key, project_id, admin: { user_id, username } }</code></p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/setup/health</span>
          <span class="auth-badge">public</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">API liveness check. Response: <code>{ status: "ok", version: "1.0.0" }</code></p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/setup/check-slug/{slug}</span>
          <span class="auth-badge">public</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Check if a project slug is available. Response: <code>{ available: boolean }</code></p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/setup/branding</span>
          <span class="auth-badge">public</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Returns the project logo and name for the login screen. Response: <code>{ logo_url, project_name }</code></p>
      </div>
    </section>

    <section id="en-auth-endpoints">
      <h2>Auth endpoints</h2>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/auth/login</span>
          <span class="auth-badge">public</span>
        </div>
        <pre><code>{ "api_key": "sproj_...", "email": "user@example.com", "password": "..." }</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem">Response: <code>{ access_token, role, user_id, project_id }</code>. Sets <code>refresh_token</code> HttpOnly cookie.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/auth/register</span>
          <span class="auth-badge">public</span>
        </div>
        <pre><code>{ "api_key": "sproj_...", "email": "...", "username": "...", "password": "..." }</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem">Registers a new user with role <code>client</code>. Same response shape as login.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/auth/refresh</span>
          <span class="auth-badge">cookie</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Renew the access token using the <code>refresh_token</code> cookie. No body needed. Response: new <code>{ access_token, role, user_id, project_id }</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/auth/logout</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Clears the refresh token cookie. Returns 204.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/auth/me</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Returns <code>{ user_id, role, project_id, username }</code> for the authenticated user.</p>
      </div>
    </section>

    <section id="en-messages">
      <h2>Messages</h2>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/messages/{room_id}</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Fetch message history for a room. Query params: <code>before</code> (ISO timestamp, for pagination), <code>limit</code> (default 50, max 100). Room IDs follow the pattern: <code>general</code>, <code>direct:{uid_a}:{uid_b}</code>, <code>ticket:{ticket_id}</code>.</p>
      </div>
      <div class="note">Real-time messages are delivered via Socket.IO <code>message:new</code> events, not by polling this endpoint.</div>
    </section>

    <section id="en-tickets">
      <h2>Tickets</h2>
      <p>Clients see only their own tickets. Agents see tickets assigned to them. Admins see all tickets.</p>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/tickets</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">List tickets. Query params: <code>status</code>, <code>priority</code>, <code>page</code>, <code>limit</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/tickets</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <pre><code>{ "title": "...", "description": "...", "priority": "normal" }</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem">Priority: <code>low</code> | <code>normal</code> | <code>high</code> | <code>urgent</code>. Returns the created ticket.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/tickets/{ticket_id}</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Get a single ticket by ID.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method patch">PATCH</span>
          <span class="path">/api/v1/tickets/{ticket_id}</span>
          <span class="auth-badge admin">agent | admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Update ticket status, priority, or agent assignment. Status machine: <code>open</code> &rarr; <code>in_progress</code> &rarr; <code>resolved</code> &rarr; <code>closed</code>.</p>
      </div>
    </section>

    <section id="en-orders">
      <h2>Orders</h2>
      <p>Clients see only their own orders. Agents and admins see all orders for the project.</p>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/orders</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">List orders. Query params: <code>status</code>, <code>page</code>, <code>limit</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/orders</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <pre><code>{ "type": "...", "title": "...", "details": {} }</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem"><code>type</code> and <code>details</code> are project-defined. Returns the created order.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method patch">PATCH</span>
          <span class="path">/api/v1/orders/{order_id}</span>
          <span class="auth-badge admin">agent | admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Update order status or agent assignment. States: <code>pending</code> &rarr; <code>active</code> &rarr; <code>taken</code> &rarr; <code>completed</code> | <code>cancelled</code>.</p>
      </div>
    </section>

    <section id="en-users">
      <h2>Users</h2>
      <span class="auth-badge admin" style="font-size:0.8rem;padding:0.2rem 0.6rem;border-radius:8px;border:1px solid #f0883e66;color:#f0883e">Admin only</span>
      <div class="endpoint" style="margin-top:1rem">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/users</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">List all users in the project. Query params: <code>role</code>, <code>page</code>, <code>limit</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/users</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <pre><code>{ "email": "...", "username": "...", "password": "...", "role": "agent" }</code></pre>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method patch">PATCH</span>
          <span class="path">/api/v1/users/{user_id}</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Update username, role, or active status.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method delete">DELETE</span>
          <span class="path">/api/v1/users/{user_id}</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Deactivate a user (soft delete).</p>
      </div>
    </section>

    <section id="en-upload">
      <h2>Upload</h2>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/upload/{room_id}</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Upload an image to a chat room. Accepts <code>multipart/form-data</code> with a single <code>file</code> field. Allowed types: JPEG, PNG, GIF, WebP. Images are compressed to WebP on the server. Returns <code>{ message_id, attachment: { url, width, height, size_bytes } }</code>. The upload also emits a <code>message:new</code> Socket.IO event to all room participants.</p>
        <div class="note">Max file size: 10 MB. Max dimension: 1920 px (proportionally scaled).</div>
      </div>
    </section>

    <section id="en-projects">
      <h2>Projects</h2>
      <span class="auth-badge admin" style="font-size:0.8rem;padding:0.2rem 0.6rem;border-radius:8px;border:1px solid #f0883e66;color:#f0883e">Admin only</span>
      <div class="endpoint" style="margin-top:1rem">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/projects/me</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Get project metadata: name, slug, settings (theme, language, logo), plan, timestamps.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method patch">PATCH</span>
          <span class="path">/api/v1/projects/me</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <pre><code>{ "name": "New Name", "settings": { "language": "es" } }</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem">Update project name or settings. Settings are deep-merged (existing keys not sent are preserved).</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/projects/me/rotate-key</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Generate a new API key. All active widget instances using the old key will be disconnected on their next reconnect. Returns <code>{ api_key, warning }</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/projects/me/logo</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Upload a project logo. <code>multipart/form-data</code>, field <code>file</code>. Returns <code>{ logo_url }</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method delete">DELETE</span>
          <span class="path">/api/v1/projects/me/logo</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Remove the current project logo.</p>
      </div>
    </section>

    <section id="en-socketio">
      <h2>Socket.IO events</h2>
      <p>Connect to <code>wss://chat.azanolabs.com/&lt;api_key&gt;</code> with <code>auth: { token: "&lt;access_token&gt;" }</code>.</p>
      <h3>Client &rarr; Server</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Event</th><th>Payload</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>room:join</code></td><td><code>{ room_id }</code></td><td>Join a chat room and receive its history</td></tr>
          <tr><td><code>room:leave</code></td><td><code>{ room_id }</code></td><td>Leave a chat room</td></tr>
          <tr><td><code>message:send</code></td><td><code>{ room_id, content, content_type }</code></td><td>Send a message. <code>content_type</code>: <code>text</code> | <code>image</code> | <code>text+image</code></td></tr>
          <tr><td><code>typing:start</code></td><td><code>{ room_id }</code></td><td>Notify others you are typing</td></tr>
          <tr><td><code>typing:stop</code></td><td><code>{ room_id }</code></td><td>Notify others you stopped typing</td></tr>
          <tr><td><code>direct:open</code></td><td><code>{ target_user_id }</code></td><td>Open a direct channel to a user (agent/admin only)</td></tr>
          <tr><td><code>message:delete</code></td><td><code>{ message_id, room_id }</code></td><td>Delete a message (admin only)</td></tr>
        </tbody>
      </table></div>
      <h3>Server &rarr; Client</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Event</th><th>Payload</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>message:history</code></td><td><code>{ room_id, messages[] }</code></td><td>Last 50 messages after <code>room:join</code></td></tr>
          <tr><td><code>message:new</code></td><td><code>{ id, room_id, user_id, username, role, content, content_type, created_at }</code></td><td>New message broadcast to the room</td></tr>
          <tr><td><code>message:deleted</code></td><td><code>{ message_id, room_id }</code></td><td>Message removed by admin</td></tr>
          <tr><td><code>typing</code></td><td><code>{ room_id, username, active }</code></td><td>Typing indicator update</td></tr>
          <tr><td><code>room:opened</code></td><td><code>{ room_id, participants[] }</code></td><td>Direct room opened by an agent</td></tr>
          <tr><td><code>error</code></td><td><code>{ code }</code></td><td>See error codes section</td></tr>
        </tbody>
      </table></div>
    </section>

    <section id="en-errors">
      <h2>Error codes</h2>
      <p>All HTTP error responses: <code>{ "error": { "code": "ERROR_CODE" } }</code><br>
      Socket.IO errors: <code>{ "code": "ERROR_CODE" }</code></p>
      <div class="table-wrap"><table>
        <thead><tr><th>Code</th><th>HTTP</th><th>Trigger</th></tr></thead>
        <tbody>
          <tr><td><code>VALIDATION_ERROR</code></td><td>400</td><td>Malformed or missing request fields</td></tr>
          <tr><td><code>AUTH_MISSING_TOKEN</code></td><td>401</td><td>Authorization header absent</td></tr>
          <tr><td><code>AUTH_TOKEN_INVALID</code></td><td>401</td><td>JWT signature invalid or malformed</td></tr>
          <tr><td><code>AUTH_TOKEN_EXPIRED</code></td><td>401</td><td>Access token past expiry</td></tr>
          <tr><td><code>AUTH_REFRESH_EXPIRED</code></td><td>401</td><td>Refresh cookie absent or expired</td></tr>
          <tr><td><code>AUTH_INVALID_CREDENTIALS</code></td><td>401</td><td>Wrong email, password, or api_key</td></tr>
          <tr><td><code>FORBIDDEN</code></td><td>403</td><td>User lacks required role</td></tr>
          <tr><td><code>FORBIDDEN_ROOM</code></td><td>403</td><td>User not allowed in that room</td></tr>
          <tr><td><code>NOT_FOUND</code></td><td>404</td><td>Resource not found</td></tr>
          <tr><td><code>PROJECT_NOT_FOUND</code></td><td>404</td><td>Unknown api_key or inactive project</td></tr>
          <tr><td><code>USERNAME_TAKEN</code></td><td>409</td><td>Username already registered in this project</td></tr>
          <tr><td><code>EMAIL_TAKEN</code></td><td>409</td><td>Email already registered in this project</td></tr>
          <tr><td><code>SLUG_TAKEN</code></td><td>409</td><td>Project slug already in use</td></tr>
          <tr><td><code>UPLOAD_TOO_LARGE</code></td><td>413</td><td>File exceeds size limit</td></tr>
          <tr><td><code>UPLOAD_TYPE_NOT_SUPPORTED</code></td><td>415</td><td>File type not allowed</td></tr>
          <tr><td><code>UPLOAD_CORRUPT</code></td><td>422</td><td>File bytes do not match declared MIME type</td></tr>
          <tr><td><code>INVALID_TRANSITION</code></td><td>422</td><td>State machine transition not allowed</td></tr>
          <tr><td><code>MESSAGE_TOO_LONG</code></td><td>422</td><td>Message exceeds 4000 characters</td></tr>
          <tr><td><code>INVALID_ROOM_ID</code></td><td>422</td><td>Room ID format invalid</td></tr>
          <tr><td><code>RATE_LIMITED</code></td><td>429</td><td>Too many requests</td></tr>
          <tr><td><code>INTERNAL_ERROR</code></td><td>500</td><td>Unhandled server error</td></tr>
        </tbody>
      </table></div>
    </section>

  </div><!-- #lang-en -->

  <!-- ==================== ESPANOL ==================== -->
  <div id="lang-es" class="lang-content">

    <div class="toc">
      <h2>Contenido</h2>
      <ol>
        <li><a href="#es-overview">Descripci&oacute;n</a></li>
        <li><a href="#es-auth">Autenticaci&oacute;n</a></li>
        <li><a href="#es-setup">Endpoints de setup</a></li>
        <li><a href="#es-auth-endpoints">Endpoints de auth</a></li>
        <li><a href="#es-messages">Mensajes</a></li>
        <li><a href="#es-tickets">Tickets</a></li>
        <li><a href="#es-orders">Ordenes</a></li>
        <li><a href="#es-users">Usuarios</a></li>
        <li><a href="#es-upload">Upload</a></li>
        <li><a href="#es-projects">Proyectos</a></li>
        <li><a href="#es-socketio">Eventos Socket.IO</a></li>
        <li><a href="#es-errors">C&oacute;digos de error</a></li>
      </ol>
    </div>

    <section id="es-overview">
      <h2>Descripci&oacute;n</h2>
      <p>Suportum es una plataforma de soporte en tiempo real multi-tenant. Una sola instancia del backend atiende m&uacute;ltiples <strong>proyectos</strong> independientes. Cada proyecto tiene sus propios usuarios, mensajes, tickets y &oacute;rdenes, aislados por <code>project_id</code>.</p>
      <h3>Roles</h3>
      <ul>
        <li><span class="role-pill role-client">client</span> Usuario final. Puede chatear, crear tickets y seguir sus propias &oacute;rdenes.</li>
        <li><span class="role-pill role-agent">agent</span> Personal de soporte. Responde chats, gestiona tickets asignados y trabaja el tablero de &oacute;rdenes.</li>
        <li><span class="role-pill role-admin">admin</span> Administrador del proyecto. Acceso total: usuarios, configuraci&oacute;n, todos los tickets y &oacute;rdenes.</li>
      </ul>
      <h3>URL base</h3>
      <pre><code>https://chat.azanolabs.com</code></pre>
    </section>

    <section id="es-auth">
      <h2>Autenticaci&oacute;n</h2>
      <p>La mayor&iacute;a de endpoints requieren un <strong>JWT access token</strong> de corta duraci&oacute;n obtenido via <code>POST /api/v1/auth/login</code> o <code>POST /api/v1/auth/register</code>.</p>
      <pre><code>Authorization: Bearer &lt;access_token&gt;</code></pre>
      <p>Los access tokens expiran a los 15 minutos. Usa el endpoint de refresh para renovar sin re-login.</p>
      <h3>API key del proyecto</h3>
      <p>Los endpoints de login y registro requieren el <code>api_key</code> del proyecto en el cuerpo de la petici&oacute;n. Identifica a qu&eacute; proyecto pertenece el usuario. La API key es un <strong>identificador p&uacute;blico del proyecto</strong>, no un secreto: es seguro incluirla en c&oacute;digo del cliente. El acceso a datos siempre requiere credenciales de usuario v&aacute;lidas adicionalmente.</p>
      <h3>Namespace de Socket.IO</h3>
      <p>La conexi&oacute;n Socket.IO usa el <code>api_key</code> como namespace:</p>
      <pre><code>io("https://chat.azanolabs.com/&lt;api_key&gt;", {
  auth: { token: "&lt;access_token&gt;" },
  transports: ["websocket"]
})</code></pre>
      <p>Endpoints p&uacute;blicos (sin auth): <code>GET /guide</code>, <code>GET /guide-ai</code>, <code>GET /api/v1/setup/health</code>, <code>GET /api/v1/setup/branding</code>, <code>GET /api/v1/setup/check-slug/{slug}</code>.</p>
    </section>

    <section id="es-setup">
      <h2>Endpoints de setup</h2>
      <p>Usados por el wizard del widget en la primera instalaci&oacute;n. Rate limit: 3 creaciones de proyecto por IP cada 24 horas.</p>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/setup</span>
          <span class="auth-badge">p&uacute;blico</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Crea un nuevo proyecto. Retorna el <code>api_key</code> usado en todas las peticiones siguientes.</p>
        <pre><code>{
  "name": "Mi Proyecto de Soporte",
  "admin_email": "admin@ejemplo.com",
  "admin_username": "admin",
  "admin_password": "min8chars",
  "language": "es",          // "en" | "es"
  "slug": "mi-proyecto",     // opcional, se auto-genera del nombre si no se env&iacute;a
  "logo_data": "data:image/png;base64,..."  // opcional
}</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem">Respuesta: <code>{ api_key, project_id, admin: { user_id, username } }</code></p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/setup/health</span>
          <span class="auth-badge">p&uacute;blico</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Verificaci&oacute;n de disponibilidad del API. Respuesta: <code>{ status: "ok", version: "1.0.0" }</code></p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/setup/check-slug/{slug}</span>
          <span class="auth-badge">p&uacute;blico</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Verifica si un slug de proyecto est&aacute; disponible. Respuesta: <code>{ available: boolean }</code></p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/setup/branding</span>
          <span class="auth-badge">p&uacute;blico</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Retorna el logo y nombre del proyecto para la pantalla de login. Respuesta: <code>{ logo_url, project_name }</code></p>
      </div>
    </section>

    <section id="es-auth-endpoints">
      <h2>Endpoints de auth</h2>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/auth/login</span>
          <span class="auth-badge">p&uacute;blico</span>
        </div>
        <pre><code>{ "api_key": "sproj_...", "email": "usuario@ejemplo.com", "password": "..." }</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem">Respuesta: <code>{ access_token, role, user_id, project_id }</code>. Establece cookie HttpOnly <code>refresh_token</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/auth/register</span>
          <span class="auth-badge">p&uacute;blico</span>
        </div>
        <pre><code>{ "api_key": "sproj_...", "email": "...", "username": "...", "password": "..." }</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem">Registra un nuevo usuario con rol <code>client</code>. Misma forma de respuesta que login.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/auth/refresh</span>
          <span class="auth-badge">cookie</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Renueva el access token usando la cookie <code>refresh_token</code>. Sin body. Respuesta: nuevo <code>{ access_token, role, user_id, project_id }</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/auth/logout</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Elimina la cookie de refresh token. Retorna 204.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/auth/me</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Retorna <code>{ user_id, role, project_id, username }</code> del usuario autenticado.</p>
      </div>
    </section>

    <section id="es-messages">
      <h2>Mensajes</h2>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/messages/{room_id}</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Historial de mensajes de una sala. Query params: <code>before</code> (timestamp ISO, para paginaci&oacute;n), <code>limit</code> (default 50, max 100). IDs de sala: <code>general</code>, <code>direct:{uid_a}:{uid_b}</code>, <code>ticket:{ticket_id}</code>.</p>
      </div>
      <div class="note">Los mensajes en tiempo real se entregan por el evento Socket.IO <code>message:new</code>, no por polling de este endpoint.</div>
    </section>

    <section id="es-tickets">
      <h2>Tickets</h2>
      <p>Los clients ven solo sus tickets. Los agents ven los asignados a ellos. Los admins ven todos.</p>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/tickets</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Listar tickets. Query params: <code>status</code>, <code>priority</code>, <code>page</code>, <code>limit</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/tickets</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <pre><code>{ "title": "...", "description": "...", "priority": "normal" }</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem">Prioridad: <code>low</code> | <code>normal</code> | <code>high</code> | <code>urgent</code>. Retorna el ticket creado.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method patch">PATCH</span>
          <span class="path">/api/v1/tickets/{ticket_id}</span>
          <span class="auth-badge admin">agent | admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Actualiza estado, prioridad o agente asignado. M&aacute;quina de estados: <code>open</code> &rarr; <code>in_progress</code> &rarr; <code>resolved</code> &rarr; <code>closed</code>.</p>
      </div>
    </section>

    <section id="es-orders">
      <h2>&Oacute;rdenes</h2>
      <p>Los clients ven solo sus &oacute;rdenes. Agents y admins ven todas las del proyecto.</p>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/orders</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Listar &oacute;rdenes. Query params: <code>status</code>, <code>page</code>, <code>limit</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/orders</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <pre><code>{ "type": "...", "title": "...", "details": {} }</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem"><code>type</code> y <code>details</code> son definidos por el proyecto. Retorna la orden creada.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method patch">PATCH</span>
          <span class="path">/api/v1/orders/{order_id}</span>
          <span class="auth-badge admin">agent | admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Actualiza estado o agente asignado. Estados: <code>pending</code> &rarr; <code>active</code> &rarr; <code>taken</code> &rarr; <code>completed</code> | <code>cancelled</code>.</p>
      </div>
    </section>

    <section id="es-users">
      <h2>Usuarios</h2>
      <span class="auth-badge admin" style="font-size:0.8rem;padding:0.2rem 0.6rem;border-radius:8px;border:1px solid #f0883e66;color:#f0883e">Solo admin</span>
      <div class="endpoint" style="margin-top:1rem">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/users</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Lista todos los usuarios del proyecto. Query params: <code>role</code>, <code>page</code>, <code>limit</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/users</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <pre><code>{ "email": "...", "username": "...", "password": "...", "role": "agent" }</code></pre>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method patch">PATCH</span>
          <span class="path">/api/v1/users/{user_id}</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Actualiza username, rol o estado activo.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method delete">DELETE</span>
          <span class="path">/api/v1/users/{user_id}</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Desactiva un usuario (soft delete).</p>
      </div>
    </section>

    <section id="es-upload">
      <h2>Upload</h2>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/upload/{room_id}</span>
          <span class="auth-badge required">Bearer</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Sube una imagen a una sala de chat. Acepta <code>multipart/form-data</code> con campo <code>file</code>. Tipos permitidos: JPEG, PNG, GIF, WebP. El servidor las comprime a WebP. Retorna <code>{ message_id, attachment: { url, width, height, size_bytes } }</code>. Tambi&eacute;n emite un evento <code>message:new</code> por Socket.IO a todos los participantes.</p>
        <div class="note">Tama&ntilde;o m&aacute;ximo: 10 MB. Dimensi&oacute;n m&aacute;xima: 1920 px (escalado proporcional).</div>
      </div>
    </section>

    <section id="es-projects">
      <h2>Proyectos</h2>
      <span class="auth-badge admin" style="font-size:0.8rem;padding:0.2rem 0.6rem;border-radius:8px;border:1px solid #f0883e66;color:#f0883e">Solo admin</span>
      <div class="endpoint" style="margin-top:1rem">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="path">/api/v1/projects/me</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Obtiene metadatos del proyecto: nombre, slug, settings (tema, idioma, logo), plan, timestamps.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method patch">PATCH</span>
          <span class="path">/api/v1/projects/me</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <pre><code>{ "name": "Nuevo Nombre", "settings": { "language": "es" } }</code></pre>
        <p style="margin-top:0.5rem;font-size:0.85rem">Actualiza nombre o settings. Los settings se fusionan (las claves no enviadas se preservan).</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/projects/me/rotate-key</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Genera una nueva API key. Todas las instancias del widget con la clave anterior se desconectar&aacute;n en su pr&oacute;xima reconexión. Retorna <code>{ api_key, warning }</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="path">/api/v1/projects/me/logo</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Sube el logo del proyecto. <code>multipart/form-data</code>, campo <code>file</code>. Retorna <code>{ logo_url }</code>.</p>
      </div>
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method delete">DELETE</span>
          <span class="path">/api/v1/projects/me/logo</span>
          <span class="auth-badge admin">admin</span>
        </div>
        <p style="margin-top:0.5rem;font-size:0.85rem">Elimina el logo actual del proyecto.</p>
      </div>
    </section>

    <section id="es-socketio">
      <h2>Eventos Socket.IO</h2>
      <p>Conectar a <code>wss://chat.azanolabs.com/&lt;api_key&gt;</code> con <code>auth: { token: "&lt;access_token&gt;" }</code>.</p>
      <h3>Cliente &rarr; Servidor</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Evento</th><th>Payload</th><th>Descripci&oacute;n</th></tr></thead>
        <tbody>
          <tr><td><code>room:join</code></td><td><code>{ room_id }</code></td><td>Unirse a una sala y recibir historial</td></tr>
          <tr><td><code>room:leave</code></td><td><code>{ room_id }</code></td><td>Salir de una sala</td></tr>
          <tr><td><code>message:send</code></td><td><code>{ room_id, content, content_type }</code></td><td>Enviar mensaje. <code>content_type</code>: <code>text</code> | <code>image</code> | <code>text+image</code></td></tr>
          <tr><td><code>typing:start</code></td><td><code>{ room_id }</code></td><td>Notificar que est&aacute;s escribiendo</td></tr>
          <tr><td><code>typing:stop</code></td><td><code>{ room_id }</code></td><td>Notificar que dejaste de escribir</td></tr>
          <tr><td><code>direct:open</code></td><td><code>{ target_user_id }</code></td><td>Abrir canal directo con un usuario (solo agent/admin)</td></tr>
          <tr><td><code>message:delete</code></td><td><code>{ message_id, room_id }</code></td><td>Eliminar mensaje (solo admin)</td></tr>
        </tbody>
      </table></div>
      <h3>Servidor &rarr; Cliente</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Evento</th><th>Payload</th><th>Descripci&oacute;n</th></tr></thead>
        <tbody>
          <tr><td><code>message:history</code></td><td><code>{ room_id, messages[] }</code></td><td>&Uacute;ltimos 50 mensajes al hacer <code>room:join</code></td></tr>
          <tr><td><code>message:new</code></td><td><code>{ id, room_id, user_id, username, role, content, content_type, created_at }</code></td><td>Nuevo mensaje broadcast a la sala</td></tr>
          <tr><td><code>message:deleted</code></td><td><code>{ message_id, room_id }</code></td><td>Mensaje eliminado por admin</td></tr>
          <tr><td><code>typing</code></td><td><code>{ room_id, username, active }</code></td><td>Indicador de escritura</td></tr>
          <tr><td><code>room:opened</code></td><td><code>{ room_id, participants[] }</code></td><td>Sala directa abierta por un agente</td></tr>
          <tr><td><code>error</code></td><td><code>{ code }</code></td><td>Ver secci&oacute;n de c&oacute;digos de error</td></tr>
        </tbody>
      </table></div>
    </section>

    <section id="es-errors">
      <h2>C&oacute;digos de error</h2>
      <p>Todas las respuestas de error HTTP: <code>{ "error": { "code": "CODIGO_DE_ERROR" } }</code><br>
      Errores Socket.IO: <code>{ "code": "CODIGO_DE_ERROR" }</code></p>
      <div class="table-wrap"><table>
        <thead><tr><th>C&oacute;digo</th><th>HTTP</th><th>Causa</th></tr></thead>
        <tbody>
          <tr><td><code>VALIDATION_ERROR</code></td><td>400</td><td>Campos faltantes o malformados</td></tr>
          <tr><td><code>AUTH_MISSING_TOKEN</code></td><td>401</td><td>Header Authorization ausente</td></tr>
          <tr><td><code>AUTH_TOKEN_INVALID</code></td><td>401</td><td>Firma JWT inv&aacute;lida o malformada</td></tr>
          <tr><td><code>AUTH_TOKEN_EXPIRED</code></td><td>401</td><td>Access token vencido</td></tr>
          <tr><td><code>AUTH_REFRESH_EXPIRED</code></td><td>401</td><td>Cookie de refresh ausente o vencida</td></tr>
          <tr><td><code>AUTH_INVALID_CREDENTIALS</code></td><td>401</td><td>Email, password o api_key incorrectos</td></tr>
          <tr><td><code>FORBIDDEN</code></td><td>403</td><td>Usuario sin el rol requerido</td></tr>
          <tr><td><code>FORBIDDEN_ROOM</code></td><td>403</td><td>Usuario no tiene acceso a esa sala</td></tr>
          <tr><td><code>NOT_FOUND</code></td><td>404</td><td>Recurso no encontrado</td></tr>
          <tr><td><code>PROJECT_NOT_FOUND</code></td><td>404</td><td>api_key desconocido o proyecto inactivo</td></tr>
          <tr><td><code>USERNAME_TAKEN</code></td><td>409</td><td>Nombre de usuario ya registrado en este proyecto</td></tr>
          <tr><td><code>EMAIL_TAKEN</code></td><td>409</td><td>Email ya registrado en este proyecto</td></tr>
          <tr><td><code>SLUG_TAKEN</code></td><td>409</td><td>Slug de proyecto ya en uso</td></tr>
          <tr><td><code>UPLOAD_TOO_LARGE</code></td><td>413</td><td>Archivo supera el l&iacute;mite de tama&ntilde;o</td></tr>
          <tr><td><code>UPLOAD_TYPE_NOT_SUPPORTED</code></td><td>415</td><td>Tipo de archivo no permitido</td></tr>
          <tr><td><code>UPLOAD_CORRUPT</code></td><td>422</td><td>Los bytes del archivo no coinciden con el MIME declarado</td></tr>
          <tr><td><code>INVALID_TRANSITION</code></td><td>422</td><td>Transici&oacute;n de estado no permitida</td></tr>
          <tr><td><code>MESSAGE_TOO_LONG</code></td><td>422</td><td>Mensaje supera 4000 caracteres</td></tr>
          <tr><td><code>INVALID_ROOM_ID</code></td><td>422</td><td>Formato de room_id inv&aacute;lido</td></tr>
          <tr><td><code>RATE_LIMITED</code></td><td>429</td><td>Demasiadas peticiones</td></tr>
          <tr><td><code>INTERNAL_ERROR</code></td><td>500</td><td>Error de servidor no controlado</td></tr>
        </tbody>
      </table></div>
    </section>

  </div><!-- #lang-es -->

</div><!-- .container -->

<script>
  function switchLang(lang, card) {
    document.querySelectorAll('.lang-card').forEach(function(c) { c.classList.remove('active'); });
    card.classList.add('active');
    document.querySelectorAll('.lang-content').forEach(function(el) { el.classList.remove('visible'); });
    document.getElementById('lang-' + lang).classList.add('visible');
    document.documentElement.lang = lang;
  }
</script>

</body>
</html>"""


def get_guide() -> HTMLResponse:
    return HTMLResponse(content=_GUIDE_HTML)
