import { put, list, get, del } from '@vercel/blob';

// Stockage durable en Vercel Blob, pattern identique à la MCO Vercheyregrard-Nataf :
// on écrit des SNAPSHOTS IMMUABLES à noms uniques (jamais réécrits) et on lit le
// plus récent via list(). Raison : Blob met en cache la lecture par URL et
// réécrire le même nom ne purge pas ce cache → un fichier mutable renverrait des
// versions périmées.
//
// NB : le motif lecture→modif→écriture n'est pas atomique (deux écritures
// simultanées : la dernière gagne). Acceptable pour un outil de campagne à faible
// concurrence ; la traçabilité fine reste assurée par le journal Google Sheet.

// Données perso (qui soutient qui) → accès privé (lecture authentifiée par token).
const ACCESS = 'private' as const;

function serialFromPathname(pathname: string): number {
  const m = pathname.match(/snap-(\d+)-/);
  return m ? parseInt(m[1], 10) : 0;
}

export async function readSnapshot<T>(prefix: string, fallback: T): Promise<T> {
  try {
    const { blobs } = await list({ prefix });
    if (!blobs.length) return fallback;
    const latest = blobs.reduce((a, b) =>
      serialFromPathname(b.pathname) >= serialFromPathname(a.pathname) ? b : a
    );
    const res = await get(latest.pathname, { access: ACCESS });
    if (!res || res.statusCode !== 200) return fallback;
    const text = await new Response(res.stream).text();
    const parsed = JSON.parse(text);
    return parsed as T;
  } catch {
    return fallback;
  }
}

export async function writeSnapshot(prefix: string, data: unknown): Promise<void> {
  const serial = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const name = `${prefix}snap-${serial}-${rand}.json`;
  await put(name, JSON.stringify(data), {
    access: ACCESS,
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: 'application/json',
  });
  // Ménage best-effort : ne garder que les 3 snapshots les plus récents.
  try {
    const { blobs } = await list({ prefix });
    const sorted = blobs.sort(
      (a, b) => serialFromPathname(b.pathname) - serialFromPathname(a.pathname)
    );
    const obsolete = sorted.slice(3);
    if (obsolete.length) await del(obsolete.map((b) => b.url));
  } catch {
    // ménage non bloquant
  }
}
