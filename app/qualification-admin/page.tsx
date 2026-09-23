'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCw, Power, Trash2, Plus, Loader2, GitCompareArrows } from 'lucide-react';
import FabianiNaquetHeader from '@/components/FabianiNaquetHeader';

interface Row {
  id: string;
  name: string;
  network: string;
  networkLabel: string;
  active: boolean;
  total: number;
  answered: number;
  link: string;
}
interface Net {
  key: string;
  label: string;
}
interface ReconcileItem {
  participant: string;
  id: string;
  name: string;
  cabinet: string;
  choice: string;
  source: string;
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '2px solid #111',
  borderRadius: 0,
  fontSize: 14,
  background: '#fff',
};
const CARD_STYLE: React.CSSProperties = {
  border: '3px solid #111',
  background: '#fff',
  padding: 22,
  marginTop: 20,
};
const BTN: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 16px',
  border: '2px solid #111',
  background: '#111',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};
const BTN_SECONDARY: React.CSSProperties = { ...BTN, background: '#fff', color: '#111' };

export default function QualifAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [networks, setNetworks] = useState<Net[]>([]);
  const [name, setName] = useState('');
  const [network, setNetwork] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ msg: string; error: boolean } | null>(null);
  const [reco, setReco] = useState<ReconcileItem[] | null>(null);
  const [recoBusy, setRecoBusy] = useState(false);

  const call = useCallback(async (body: Record<string, unknown>, msg?: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/qualif-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setRows(data.participants || []);
      setNetworks(data.networks || []);
      if (msg) setNotice({ msg, error: false });
      return true;
    } catch (e) {
      setNotice({ msg: e instanceof Error ? e.message : 'Erreur', error: true });
      return false;
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    call({ action: 'dashboard' });
  }, [call]);

  useEffect(() => {
    if (!network && networks.length) setNetwork(networks[0].key);
  }, [networks, network]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await call({ action: 'createUser', name, network }, 'Lien créé. Prêt à envoyer.');
    if (ok) setName('');
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setNotice({ msg: 'Lien copié.', error: false });
    } catch {
      window.prompt('Copiez ce lien :', link);
    }
  }

  async function loadReconcile() {
    setRecoBusy(true);
    try {
      const res = await fetch('/api/qualif-admin?action=reconcile', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setReco(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setNotice({ msg: e instanceof Error ? e.message : 'Erreur', error: true });
    } finally {
      setRecoBusy(false);
    }
  }

  return (
    <>
      <FabianiNaquetHeader />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 18px 70px' }}>
        <p style={{ letterSpacing: '.13em', textTransform: 'uppercase', color: '#3078C6', fontSize: 12, fontWeight: 800 }}>
          Qualification des contacts
        </p>
        <h1 style={{ fontSize: 30, marginTop: 8, fontWeight: 800 }}>Liens de qualification</h1>
        <p style={{ marginTop: 6, color: '#555' }}>
          Créez un lien personnel par candidat, envoyez-le : la personne qualifie son réseau depuis son téléphone, tout
          se sauvegarde et se reprend automatiquement dans son onglet dédié du Google Sheet.
        </p>

        {notice && (
          <div
            role="status"
            style={{
              marginTop: 16,
              padding: '12px 16px',
              border: '2px solid #111',
              background: notice.error ? '#fbecef' : '#eaf5ee',
              color: notice.error ? '#953349' : '#275b3c',
            }}
          >
            {notice.msg}
          </div>
        )}

        <section style={CARD_STYLE}>
          <h2 style={{ marginBottom: 14, fontSize: 18, fontWeight: 700 }}>Créer un lien</h2>
          <form onSubmit={create} style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }} htmlFor="qa-name">
                Prénom / nom affiché
              </label>
              <input
                id="qa-name"
                style={INPUT_STYLE}
                value={name}
                maxLength={100}
                placeholder="Ex. Frédéric"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }} htmlFor="qa-net">
                Réseau (liste auto)
              </label>
              <select id="qa-net" style={INPUT_STYLE} value={network} onChange={(e) => setNetwork(e.target.value)}>
                {networks.map((n) => (
                  <option key={n.key} value={n.key}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
            <button style={BTN} disabled={busy} type="submit">
              <Plus size={16} /> Créer le lien
            </button>
          </form>
        </section>

        <section style={CARD_STYLE}>
          <h2 style={{ marginBottom: 6, fontSize: 18, fontWeight: 700 }}>Participants</h2>
          {loading ? (
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555' }}>
              <Loader2 size={16} className="animate-spin" /> Chargement…
            </p>
          ) : rows.length === 0 ? (
            <p style={{ color: '#555' }}>Aucun participant pour le moment.</p>
          ) : (
            rows.map((r): React.ReactElement => (
              <div key={r.id} style={{ borderTop: '1px solid #ddd', padding: '18px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 17 }}>{r.name}</strong>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      border: '1px solid #111',
                      background: r.active ? '#eaf5ee' : '#fbecef',
                      color: r.active ? '#34754c' : '#a73d53',
                    }}
                  >
                    {r.active ? 'Actif' : 'Suspendu'}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#555' }}>
                    Réseau {r.networkLabel} · {r.answered}/{r.total} qualifiés
                  </span>
                </div>
                <input
                  readOnly
                  value={r.link}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  style={{ ...INPUT_STYLE, marginTop: 10, fontSize: 12 }}
                  aria-label={`Lien personnel de ${r.name}`}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <button style={BTN_SECONDARY} type="button" onClick={() => copy(r.link)}>
                    <Copy size={14} /> Copier le lien
                  </button>
                  <button
                    style={BTN_SECONDARY}
                    type="button"
                    disabled={busy}
                    onClick={() => call({ action: 'setActive', id: r.id, active: !r.active }, 'Accès mis à jour.')}
                  >
                    <Power size={14} /> {r.active ? 'Désactiver' : 'Réactiver'}
                  </button>
                  <button
                    style={BTN_SECONDARY}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`L’ancien lien de ${r.name} sera invalidé (progression conservée). Continuer ?`))
                        call({ action: 'rotateUser', id: r.id }, 'Nouveau lien créé.');
                    }}
                  >
                    <RefreshCw size={14} /> Renouveler le lien
                  </button>
                  <button
                    style={{ ...BTN, background: '#fbebee', color: '#a73d53', borderColor: '#a73d53' }}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Supprimer l’accès de ${r.name} ? Ses réponses restent dans le Sheet.`))
                        call({ action: 'deleteUser', id: r.id }, 'Accès supprimé. Réponses conservées.');
                    }}
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section style={CARD_STYLE}>
          <h2 style={{ marginBottom: 6, fontSize: 18, fontWeight: 700 }}>Réconciliation avec le doc principal</h2>
          <p style={{ color: '#555', marginBottom: 14 }}>
            Profils classés dans le swipe (C1, C2, C3, Blacklist) dont la valeur diffère du classement source du doc
            principal — donc pas encore reportés.
          </p>
          <button style={BTN_SECONDARY} type="button" onClick={loadReconcile} disabled={recoBusy}>
            {recoBusy ? <Loader2 size={14} className="animate-spin" /> : <GitCompareArrows size={14} />} Vérifier
          </button>

          {reco !== null && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 10 }}>
                {reco.length} profil{reco.length > 1 ? 's' : ''} non reporté{reco.length > 1 ? 's' : ''}
              </p>
              {reco.length === 0 ? (
                <p style={{ color: '#275b3c' }}>Tout est à jour dans le doc principal.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #111' }}>
                        <th style={{ padding: '8px 6px' }}>Participant</th>
                        <th style={{ padding: '8px 6px' }}>Nom</th>
                        <th style={{ padding: '8px 6px' }}>Cabinet</th>
                        <th style={{ padding: '8px 6px' }}>Choix swipe</th>
                        <th style={{ padding: '8px 6px' }}>Valeur source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reco.map((it, i): React.ReactElement => (
                        <tr key={`${it.participant}-${it.id}-${i}`} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '8px 6px' }}>{it.participant}</td>
                          <td style={{ padding: '8px 6px' }}>{it.name}</td>
                          <td style={{ padding: '8px 6px', color: '#555' }}>{it.cabinet || '—'}</td>
                          <td style={{ padding: '8px 6px', fontWeight: 700 }}>{it.choice}</td>
                          <td style={{ padding: '8px 6px', color: '#555' }}>{it.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
