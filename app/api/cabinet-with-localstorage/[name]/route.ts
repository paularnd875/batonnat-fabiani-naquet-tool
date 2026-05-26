import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const resolvedParams = await params;
    const cabinetName = decodeURIComponent(resolvedParams.name);
    const { localStorageStatuses } = await request.json();
    
    // Récupérer les avocats du cabinet depuis l'API normale
    const baseUrl = request.url.replace('/cabinet-with-localstorage/', '/cabinet/');
    const cabinetResponse = await fetch(baseUrl, {
      headers: {
        'Cookie': request.headers.get('Cookie') || ''
      }
    });
    
    if (!cabinetResponse.ok) {
      throw new Error('Erreur lors de la récupération du cabinet');
    }
    
    const cabinetData = await cabinetResponse.json();
    
    if (!cabinetData.success) {
      return NextResponse.json(cabinetData);
    }
    
    // Fusionner avec les statuts localStorage
    const lawyersWithLocalStorage = cabinetData.cabinet.lawyers.map((lawyer: any) => {
      const localStatus = localStorageStatuses[lawyer.prenomnom];
      if (localStatus !== undefined && localStatus !== null) {
        return {
          ...lawyer,
          classement: localStatus
        };
      }
      return lawyer;
    });
    
    // Recalculer les stats avec les nouveaux statuts
    const stats = {
      ...cabinetData.cabinet.stats,
      c1_count: 0,
      c2_count: 0, 
      c3_count: 0,
      bl_count: 0,
      unclassified_count: 0
    };
    
    lawyersWithLocalStorage.forEach((lawyer: any) => {
      switch (lawyer.classement) {
        case 'C1': stats.c1_count++; break;
        case 'C2': stats.c2_count++; break;
        case 'C3': stats.c3_count++; break;
        case 'Blacklist': stats.bl_count++; break;
        default: stats.unclassified_count++; break;
      }
    });
    
    console.log(`🔄 Fusion localStorage Cabinet ${cabinetName}: ${Object.keys(localStorageStatuses).length} statuts appliqués`);
    
    return NextResponse.json({
      ...cabinetData,
      cabinet: {
        ...cabinetData.cabinet,
        lawyers: lawyersWithLocalStorage,
        stats
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur API cabinet-with-localstorage:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}