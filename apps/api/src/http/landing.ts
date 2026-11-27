/** Lightweight invite landing page (≈2 KB). Never queries the database. */

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string,
  );

export function landingPage(rawCode: string, playStoreUrl: string, androidPackage: string): string {
  const code = rawCode
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, 10);
  const pretty = code.length === 10 ? `${code.slice(0, 5)}-${code.slice(5)}` : code;
  const intent = `intent://i/${code}#Intent;scheme=entrenos;package=${androidPackage};S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;
  return `<!doctype html>
<html lang="es-CO">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Te invitaron a un amigo secreto · Entre Nos</title>
<style>
:root{--bg:#FFF8F3;--fg:#2B1E1A;--muted:#6B5A53;--primary:#C2453A;--card:#fff;--border:#E8D9D0}
@media (prefers-color-scheme:dark){:root{--bg:#1A1412;--fg:#F5ECE6;--muted:#C9B8AE;--primary:#FF8A7A;--card:#241C19;--border:#3A2E2A}}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--fg);display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
main{max-width:420px;width:100%;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:28px 22px;text-align:center}
h1{font-size:1.5rem;margin:0 0 8px}p{color:var(--muted);line-height:1.5;margin:0 0 18px}
.code{font-size:2rem;letter-spacing:.12em;font-weight:700;margin:8px 0 22px;color:var(--fg)}
a.btn{display:block;background:var(--primary);color:#fff;text-decoration:none;font-weight:700;border-radius:14px;padding:16px;margin:10px 0;min-height:48px;box-sizing:border-box}
@media (prefers-color-scheme:dark){a.btn{color:#1A1412}}
a.alt{color:var(--fg);display:block;padding:12px}
</style>
</head>
<body>
<main>
<h1>¡Te invitaron a un amigo secreto! 🎁</h1>
<p>Abre la invitación en la app Entre Nos. Si todavía no la tienes, instálala y escribe este código:</p>
<div class="code" aria-label="Código de invitación">${escape(pretty)}</div>
<a class="btn" href="${escape(intent)}">Abrir en la app</a>
<a class="alt" href="${escape(playStoreUrl)}">Descargar en Google Play</a>
</main>
</body>
</html>`;
}

export function assetLinks(androidPackage: string, fingerprints: string[]) {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: androidPackage,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
