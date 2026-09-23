// Migration one-shot Supabase -> Vercel Blob (équipe + assignations).
// Préserve les id à l'identique pour que les assignations restent cohérentes.
//
// Prérequis : .env.local doit contenir SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// et BLOB_READ_WRITE_TOKEN. Lancer depuis la racine du projet :
//   node scripts/migrate-supabase-to-blob.mjs           (dry-run : affiche seulement)
//   node scripts/migrate-supabase-to-blob.mjs --write    (écrit réellement dans Blob)

import fs from 'fs';
import { put, list } from '@vercel/blob';

const WRITE = process.argv.includes('--write');

// --- charge .env.local ---
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) {
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[m[1]] = v;
  }
}
const SB_URL = env.SUPABASE_URL;
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
process.env.BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
if (!SB_URL || !SB_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants');
if (WRITE && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN manquant (nécessaire pour --write)');

async function sbSelect(table, cols) {
  const rows = [];
  let from = 0;
  const step = 1000;
  for (;;) {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?select=${cols}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Range: `${from}-${from + step - 1}` },
    });
    const chunk = await r.json();
    if (!Array.isArray(chunk)) throw new Error(`Lecture ${table} : ${JSON.stringify(chunk)}`);
    rows.push(...chunk);
    if (chunk.length < step) break;
    from += step;
  }
  return rows;
}

async function writeSnapshot(prefix, data) {
  const name = `${prefix}snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const res = await put(name, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: 'application/json',
  });
  return { name, url: res.url };
}

(async () => {
  // Fusion des doublons de membres : id supprimé -> id survivant. Les assignations
  // pointant vers un id supprimé sont réaffectées au survivant (puis dédoublonnées
  // sur le couple avocat/membre). L'entrée conjointe « Marie-Hélène & Frédéric »
  // est conservée (on ne garde qu'une seule occurrence, la complète).
  const MERGE = {
    '63e4c485-b617-4726-94c8-4c5367fe68af': 'f0fe6b4f-0bf6-40cb-806d-028c1dcecd71', // Frédéric Naquet
    'd6c5a4d6-9cad-4173-ac1b-3772fcd3e409': '57917cec-a6fb-47b9-bec4-c29f153125fb', // Marie-Hélène Fabiani
    '86e99dc1-47e8-4653-9bda-c7241a198bd8': 'c68360c0-2d03-43f9-b532-a4543609edb8', // Marie-Hélène & Frédéric (entrée conjointe)
  };

  // Équipe (on retire les membres fusionnés)
  const teamRaw = await sbSelect('team_members', 'id,prenom,nom,email,created_at');
  const team = teamRaw
    .filter((m) => !MERGE[m.id])
    .map((m) => ({ id: m.id, prenom: m.prenom, nom: m.nom, email: m.email, created_at: m.created_at }));

  // Assignations (remap des id fusionnés puis dédoublonnage du couple)
  const assignRaw = await sbSelect('assignments', 'id,lawyer_prenomnom,team_member_id,assigned_at');
  const seen = new Set();
  const assignments = [];
  for (const a of assignRaw) {
    const tmid = MERGE[a.team_member_id] || a.team_member_id;
    const key = `${a.lawyer_prenomnom}::${tmid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    assignments.push({ id: a.id, lawyer_prenomnom: a.lawyer_prenomnom, team_member_id: tmid, assigned_at: a.assigned_at });
  }

  console.log(`Équipe : ${teamRaw.length} -> ${team.length} membres (après fusion de ${teamRaw.length - team.length})`);
  console.log(`Assignations : ${assignRaw.length} -> ${assignments.length}`);
  // sanity : chaque assignation pointe-t-elle vers un membre connu ?
  const ids = new Set(team.map((m) => m.id));
  const orphans = assignments.filter((a) => !ids.has(a.team_member_id));
  console.log(`Assignations orphelines (membre inconnu) : ${orphans.length}`);
  if (orphans.length) console.log('  -> ', orphans.map((o) => o.team_member_id).slice(0, 5));
  console.log('Membres finaux :', team.map((m) => `${m.prenom} ${m.nom}`).join(' | '));

  if (!WRITE) {
    console.log('\n(DRY-RUN) Relancer avec --write pour écrire dans Blob.');
    return;
  }
  const t = await writeSnapshot('team/', team);
  const a = await writeSnapshot('assignments/', assignments);
  console.log('\nÉcrit dans Blob :');
  console.log('  team       ->', t.name);
  console.log('  assignments->', a.name);
  const { blobs } = await list({ prefix: 'assignments/' });
  console.log('Snapshots assignments présents :', blobs.length);
})().catch((e) => {
  console.error('ERREUR migration:', e.message);
  process.exit(1);
});
