import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oljogamhjdhlcrqkowpf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sam9nYW1oamRobGNycWtvd3BmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ2NTQ4NSwiZXhwIjoyMDkzMDQxNDg1fQ.Jz3C7RAG6KCPqjCKdQKIrAVuVzg1bps2lGyT02HNVLk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCabinet() {
  console.log('🔍 Test classements globaux...');
  
  // Compter tous les classements
  const { data: allLawyers, error } = await supabase
    .from('lawyers')
    .select('classement, soutien_public')
    .limit(10000);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  const counts = {};
  let soutienPublicCount = 0;
  
  allLawyers.forEach(lawyer => {
    const classement = lawyer.classement || 'Non classé';
    counts[classement] = (counts[classement] || 0) + 1;
    if (lawyer.soutien_public) soutienPublicCount++;
  });

  console.log('📊 Comptage des classements (sur 10 000 premiers):');
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([classement, count]) => {
    console.log(`  ${classement}: ${count}`);
  });
  console.log(`  Soutiens publics: ${soutienPublicCount}`);
  
  // Compter le total dans la base
  const { count: totalCount } = await supabase
    .from('lawyers')
    .select('*', { count: 'exact', head: true });
    
  console.log(`📊 Total avocats dans la base: ${totalCount}`);
}

testCabinet();