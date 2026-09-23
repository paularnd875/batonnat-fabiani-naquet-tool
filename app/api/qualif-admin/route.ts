import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  NETWORKS,
  createParticipant,
  deleteParticipant,
  listWithStats,
  reconcileWithSource,
  rotateToken,
  setActive,
} from '@/lib/qualif';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// API d'administration des liens de qualification. Protegee par le cookie
// d'auth de l'outil (auth-session, via le middleware) : les participants n'y
// ont pas acces. Cette route N'EST PAS dans les publicRoutes du middleware.

function originOf(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

async function dashboard(origin: string) {
  const rows = await listWithStats();
  return {
    networks: Object.entries(NETWORKS).map(([key, v]) => ({ key, label: v.label })),
    participants: rows.map((p) => ({
      id: p.id,
      name: p.name,
      network: p.network,
      networkLabel: p.networkLabel,
      active: p.active,
      total: p.total,
      answered: p.answered,
      link: `${origin}/q/${p.token}`,
    })),
  };
}

export async function GET(req: NextRequest) {
  try {
    const action = new URL(req.url).searchParams.get('action') || '';
    if (action === 'reconcile') {
      return NextResponse.json({ items: await reconcileWithSource() });
    }
    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur inconnue.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || '');
    const origin = originOf(req);

    if (action === 'dashboard') {
      return NextResponse.json(await dashboard(origin));
    }
    if (action === 'createUser') {
      await createParticipant(String(body.name || ''), String(body.network || ''));
      return NextResponse.json(await dashboard(origin));
    }
    if (action === 'rotateUser') {
      await rotateToken(String(body.id || ''));
      return NextResponse.json(await dashboard(origin));
    }
    if (action === 'setActive') {
      await setActive(String(body.id || ''), body.active === true);
      return NextResponse.json(await dashboard(origin));
    }
    if (action === 'deleteUser') {
      await deleteParticipant(String(body.id || ''));
      return NextResponse.json(await dashboard(origin));
    }
    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur inconnue.' }, { status: 500 });
  }
}
