import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const resolvedParams = await params;
    const cabinetName = decodeURIComponent(resolvedParams.name);
    const { localStorageStatuses, params: requestParams } = await request.json();
    
    // Construire l'URL avec les paramètres de pagination si fournis
    const { searchParams } = new URL(request.url);
    let cabinetUrl = request.url.replace('/cabinet-with-localstorage/', '/cabinet/');
    
    // Ajouter les paramètres de pagination s'ils existent
    if (requestParams?.page || requestParams?.limit || searchParams.get('page') || searchParams.get('limit')) {
      const params = new URLSearchParams();
      if (requestParams?.page || searchParams.get('page')) {
        params.set('page', requestParams?.page || searchParams.get('page') || '1');
      }
      if (requestParams?.limit || searchParams.get('limit')) {
        params.set('limit', requestParams?.limit || searchParams.get('limit') || '50');
      }
      cabinetUrl += `?${params.toString()}`;
    }
    
    // Récupérer les avocats du cabinet depuis l'API normale
    const cabinetResponse = await fetch(cabinetUrl, {
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
    
    // Recalculer les stats avec les nouveaux statuts POUR TOUTE LA LISTE (pas seulement la page courante)
    const stats = {
      ...cabinetData.cabinet.stats,
      c1_count: 0,
      c2_count: 0, 
      c3_count: 0,
      bl_count: 0,
      unclassified_count: 0
    };
    
    // Pour recalculer correctement, nous devons prendre en compte TOUS les avocats du cabinet
    // Pas seulement ceux de la page courante
    // L'API cabinet renvoie déjà les bonnes stats totales, on peut les utiliser comme base
    
    // Si on a appliqué des changements localStorage, on doit recalculer depuis TOUS les avocats
    if (Object.keys(localStorageStatuses).length > 0) {
      // On garde les stats de base et on ajuste seulement pour les changements localStorage
      // C'est une approximation car on n'a pas tous les avocats ici, seulement la page courante
      
      // Calculer combien d'avocats de la page courante ont changé
      let deltaC1 = 0, deltaC2 = 0, deltaC3 = 0, deltaBL = 0, deltaUnclassified = 0;
      
      lawyersWithLocalStorage.forEach((lawyer: any, index: number) => {
        const originalLawyer = cabinetData.cabinet.lawyers[index];
        const oldStatus = originalLawyer?.classement;
        const newStatus = lawyer.classement;
        
        if (oldStatus !== newStatus) {
          // Décrémenter l'ancien
          switch (oldStatus) {
            case 'C1': deltaC1--; break;
            case 'C2': deltaC2--; break;
            case 'C3': deltaC3--; break;
            case 'Blacklist': deltaBL--; break;
            default: deltaUnclassified--; break;
          }
          
          // Incrémenter le nouveau
          switch (newStatus) {
            case 'C1': deltaC1++; break;
            case 'C2': deltaC2++; break;
            case 'C3': deltaC3++; break;
            case 'Blacklist': deltaBL++; break;
            default: deltaUnclassified++; break;
          }
        }
      });
      
      stats.c1_count = Math.max(0, (cabinetData.cabinet.stats.c1_count || 0) + deltaC1);
      stats.c2_count = Math.max(0, (cabinetData.cabinet.stats.c2_count || 0) + deltaC2);
      stats.c3_count = Math.max(0, (cabinetData.cabinet.stats.c3_count || 0) + deltaC3);
      stats.bl_count = Math.max(0, (cabinetData.cabinet.stats.bl_count || 0) + deltaBL);
      stats.unclassified_count = Math.max(0, (cabinetData.cabinet.stats.unclassified_count || 0) + deltaUnclassified);
      
      console.log(` Fusion localStorage Cabinet ${cabinetName}: ${Object.keys(localStorageStatuses).length} statuts appliqués - Deltas: C1${deltaC1>=0?'+':''}${deltaC1} C2${deltaC2>=0?'+':''}${deltaC2} C3${deltaC3>=0?'+':''}${deltaC3} BL${deltaBL>=0?'+':''}${deltaBL}`);
    } else {
      // Pas de changements localStorage, garder les stats originales
      console.log(` Cabinet ${cabinetName}: Aucun changement localStorage, stats originales conservées`);
    }
    
    return NextResponse.json({
      ...cabinetData,
      cabinet: {
        ...cabinetData.cabinet,
        lawyers: lawyersWithLocalStorage,
        stats
      }
    });
    
  } catch (error) {
    console.error(' Erreur API cabinet-with-localstorage:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}