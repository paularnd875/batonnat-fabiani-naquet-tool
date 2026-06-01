import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { localStorageStatuses, params } = await request.json();
    
    // Construire l'URL avec les paramètres de filtrage si fournis
    let lawyersUrl = request.url.replace('/lawyers-with-localstorage', '/lawyers');
    if (params) {
      const searchParams = new URLSearchParams(params);
      lawyersUrl += `?${searchParams.toString()}`;
    }
    
    // Récupérer les avocats depuis l'API normale
    const lawyersResponse = await fetch(lawyersUrl, {
      headers: {
        'Cookie': request.headers.get('Cookie') || ''
      }
    });
    
    if (!lawyersResponse.ok) {
      throw new Error('Erreur lors de la récupération des avocats');
    }
    
    const lawyersData = await lawyersResponse.json();
    
    if (!lawyersData.success) {
      return NextResponse.json(lawyersData);
    }
    
    // Fusionner avec les statuts localStorage
    const lawyersWithLocalStorage = lawyersData.lawyers.map((lawyer: any) => {
      const localStatus = localStorageStatuses[lawyer.prenomnom];
      if (localStatus !== undefined && localStatus !== null) {
        return {
          ...lawyer,
          classement: localStatus
        };
      }
      return lawyer;
    });
    
    console.log(` Fusion localStorage: ${Object.keys(localStorageStatuses).length} statuts appliqués`);
    
    return NextResponse.json({
      ...lawyersData,
      lawyers: lawyersWithLocalStorage
    });
    
  } catch (error) {
    console.error(' Erreur API lawyers-with-localstorage:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}