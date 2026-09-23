import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// La synchronisation vers Supabase (tables lawyers/firms) n'a plus lieu d'être :
// la recherche lit désormais le Google Sheet en direct (via unifiedData/googleSheets).
export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Sync Supabase retirée : les données avocats/cabinets sont lues en direct depuis le Google Sheet.',
  });
}
