/**
 * Privacy policy served at /privacidad (Play Store requires a public URL).
 * POLICY_MARKDOWN must match docs/tienda/politica-privacidad.md (a test checks it).
 * "[tu correo]" is replaced by CONTACT_EMAIL when configured.
 */

export const POLICY_MARKDOWN =
  '# Política de privacidad — Entre Nos\n\n_Última actualización: 27 de noviembre de 2026_\n\nEntre Nos ("la app") sirve para organizar el amigo secreto. Esta política explica qué datos usamos y por qué. Responsable: Ing. Yadir (desarrollador independiente), contacto: **[tu correo]**.\n\n## Qué datos recogemos\n- **Cuenta:** tu nombre, tu correo y un identificador que nos da Google cuando inicias sesión. No vemos tu contraseña.\n- **Lo que tú agregas:** foto de perfil o de grupo (opcional), los grupos que creas o a los que te unes, tu lista de deseos y los mensajes del chat anónimo.\n- **Notificaciones:** un identificador técnico de tu celular para enviarte avisos (por ejemplo, "ya hicieron el sorteo"). Puedes desactivarlas en los ajustes del teléfono.\n\nNo recogemos tu ubicación, tus contactos ni datos de pago, y no usamos publicidad ni analítica de terceros.\n\n## Para qué los usamos\nSolo para que la app funcione: mostrarte en tus grupos, hacer el sorteo, mostrarle tu lista de deseos a quien te regala, entregar los mensajes y enviarte recordatorios.\n\n## El secreto del sorteo\nEl sorteo se hace en nuestro servidor. Ni el organizador ni los demás miembros pueden ver a quién le tocó cada quien hasta la revelación. Quien te regala y tú hablan de forma anónima: la app nunca le muestra a nadie quién escribe del otro lado. La relación de quién le regala a quién se guarda cifrada.\n\n## Con quién los compartimos\nCon nadie para fines comerciales. Usamos proveedores que guardan y procesan los datos por nosotros: **Cloudflare** (servidores de la API), **MongoDB Atlas** (base de datos) y **Expo** (envío de notificaciones). Google interviene solo en el inicio de sesión.\n\n## Cuánto tiempo los guardamos\nLos grupos, sorteos, mensajes y listas de deseos se **borran automáticamente 60 días después de la fecha de entrega**. Tu cuenta se queda hasta que la elimines.\n\n## Tus derechos\nPuedes ver y corregir tu nombre y foto en *Perfil*, y **eliminar tu cuenta** desde *Perfil → Eliminar mi cuenta*. Si tienes dudas o quieres ejercer tus derechos según la Ley 1581 de 2012 (Habeas Data, Colombia), escríbenos a **[tu correo]**.\n\n## Menores\nLa app es para personas de 13 años o más.\n\n## Seguridad\nToda la comunicación va cifrada (HTTPS). Guardamos tu sesión en el almacenamiento seguro del celular.\n\n## Cambios\nSi cambiamos esta política te avisaremos en la app.\n';

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string,
  );

/** Inline subset: **bold** and _italic_ / *italic*. Input is already escaped. */
const inline = (s: string) =>
  s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])[_*](.+?)[_*](?=[\s).,:;]|$)/g, '$1<em>$2</em>');

export function renderMarkdown(md: string): string {
  const out: string[] = [];
  let list = false;
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    const item = /^- (.*)$/.exec(line);
    if (!item && list) {
      out.push('</ul>');
      list = false;
    }
    if (line === '') continue;
    const h = /^(#{1,3}) (.*)$/.exec(line);
    if (h) {
      const level = (h[1] as string).length;
      out.push(`<h${level}>${inline(escape(h[2] as string))}</h${level}>`);
    } else if (item) {
      if (!list) out.push('<ul>');
      list = true;
      out.push(`<li>${inline(escape(item[1] as string))}</li>`);
    } else {
      out.push(`<p>${inline(escape(line))}</p>`);
    }
  }
  if (list) out.push('</ul>');
  return out.join('\n');
}

export function privacyPage(contactEmail: string | null): string {
  const contact = contactEmail ?? 'la ficha de la app en Google Play';
  const body = renderMarkdown(POLICY_MARKDOWN.replaceAll('[tu correo]', contact));
  return `<!doctype html>
<html lang="es-CO">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Política de privacidad · Entre Nos</title>
<style>
:root{--bg:#FFF8F3;--fg:#2B1E1A;--muted:#6B5A53;--primary:#C2453A}
@media (prefers-color-scheme:dark){:root{--bg:#1A1412;--fg:#F5ECE6;--muted:#C9B8AE;--primary:#FF8A7A}}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--fg);line-height:1.6;padding:24px 16px}
main{max-width:680px;margin:0 auto}h1{font-size:1.6rem}h2{font-size:1.15rem;margin-top:1.8em;color:var(--primary)}
p,li{color:var(--fg)}em{color:var(--muted)}
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
}
