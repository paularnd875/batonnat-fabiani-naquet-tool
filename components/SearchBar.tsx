'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, Building2, Loader2, X, Shield, Award, AlertCircle, Users, UserCheck, Briefcase } from 'lucide-react';
import Link from 'next/link';

interface Lawyer {
  prenomnom: string;
  nom_complet: string;
  civilite: string;
  cabinet: string;
  email: string;
  photo_url?: string;
  specialisations?: string[];
  classement: string;
  soutien_public: boolean;
  statut_cabinet?: string;
}

interface Cabinet {
  name: string;
  originalName: string;
  lawyer_count: number;
  c1_count: number;
  c2_count: number;
  c3_count: number;
  bl_count: number;
  soutien_public_count: number;
  sample_lawyers: Array<{nom_complet: string; prenomnom: string}>;
}

interface SearchResults {
  lawyers: Lawyer[];
  cabinets: Cabinet[];
  query: string;
  totalFound: number;
  searchTime: number;
  totalLawyersFound?: number;
  totalCabinetsFound?: number;
}

interface SearchBarProps {
  onSearchResults?: (results: SearchResults | null) => void;
  showDropdown?: boolean;
}

export default function SearchBar({ onSearchResults, showDropdown = true }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchType, setSearchType] = useState<'all' | 'lawyers' | 'cabinets'>('all');
  const [classificationFilter, setClassificationFilter] = useState<'all' | 'C1' | 'C2' | 'C3' | 'BL' | 'SP'>('all');
  const [exerciceFilter, setExerciceFilter] = useState<'all' | 'Individuel' | 'Collaborateur' | 'Associé' | 'SCP'>('all');
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recherche avec debounce
  useEffect(() => {
    // Si pas de texte ET pas de filtre de classification, on n'affiche rien
    if (query.length < 2 && classificationFilter === 'all' && exerciceFilter === 'all') {
      setResults(null);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Utiliser une limite plus élevée quand on filtre par classification sans texte
        const limit = (!query && (classificationFilter !== 'all' || exerciceFilter !== 'all')) ? 5000 : 50;
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${searchType}&classification=${classificationFilter}&exercice=${exerciceFilter}&limit=${limit}`);
        const data = await response.json();
        
        if (data.success) {
          setResults(data.results);
          setShowResults(showDropdown);
          // Transmettre les résultats au parent
          onSearchResults?.(data.results);
        }
      } catch (error) {
        console.error('Erreur de recherche:', error);
      } finally {
        setIsLoading(false);
      }
    }, 200); // Debounce de 200ms

    return () => clearTimeout(timeoutId);
  }, [query, searchType, classificationFilter, exerciceFilter]);

  // Fermer les résultats si clic externe
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setShowResults(false);
    setClassificationFilter('all');
    setExerciceFilter('all');
    // Notifier le parent de l'effacement
    onSearchResults?.(null);
    inputRef.current?.focus();
  };

  const getClassementBadge = (classement: string) => {
    const badges = {
      'C1': 'fn-badge fn-badge-c1 text-xs px-2 py-1',
      'C2': 'fn-badge fn-badge-c2 text-xs px-2 py-1',
      'C3': 'fn-badge fn-badge-c3 text-xs px-2 py-1',
      'Blacklist': 'fn-badge fn-badge-bl text-xs px-2 py-1'
    };
    return badges[classement as keyof typeof badges] || '';
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Barre de recherche principale */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setShowResults(true)}
          placeholder="Rechercher un avocat ou un cabinet..."
          className="fn-input text-base"
          style={{ paddingLeft: '5rem', paddingRight: '3rem' }}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Filtres organisés par sections */}
      <div className="mt-4 space-y-6">
        
        {/* Section 1: Type de résultat */}
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Type de résultat</h4>
          <div className="flex gap-1 sm:gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Tout', icon: Search },
              { key: 'lawyers', label: 'Avocats', icon: User },
              { key: 'cabinets', label: 'Cabinets', icon: Building2 }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSearchType(key as any)}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
                  searchType === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Section 2: Classification */}
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Classification</h4>
          <div className="flex gap-1 sm:gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Toutes', icon: Search, color: 'gray' },
            { key: 'SP', label: 'Soutien public', icon: Shield, color: 'violet' },
            { key: 'C1', label: 'C1', icon: Award, color: 'emerald' },
            { key: 'C2', label: 'C2', icon: Award, color: 'green' },
            { key: 'C3', label: 'C3', icon: Award, color: 'yellow' },
            { key: 'BL', label: 'Blacklist', icon: AlertCircle, color: 'red' }
          ].map(({ key, label, icon: Icon, color }) => {
            const isActive = classificationFilter === key;
            
            let buttonStyle = {};
            let buttonClass = 'flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors';
            
            if (isActive) {
              switch (key) {
                case 'SP':
                  buttonStyle = { backgroundColor: '#8B5CF6', color: 'white' };
                  break;
                case 'C1':
                  buttonStyle = { backgroundColor: '#0d9488', color: 'white' };
                  break;
                case 'C2':
                  buttonStyle = { backgroundColor: '#22c55e', color: 'white' };
                  break;
                case 'C3':
                  buttonStyle = { backgroundColor: '#eab308', color: 'white' };
                  break;
                case 'BL':
                  buttonStyle = { backgroundColor: '#D93025', color: 'white' };
                  break;
                default:
                  buttonClass += ' bg-gray-600 text-white';
              }
            } else {
              // Styles non-actifs avec couleurs spécifiques
              switch (key) {
                case 'SP':
                  buttonClass += ' bg-violet-100 text-violet-700 hover:bg-violet-200';
                  break;
                case 'C1':
                  buttonClass += ' bg-teal-100 text-teal-700 hover:bg-teal-200';
                  break;
                case 'C2':
                  buttonClass += ' bg-green-100 text-green-700 hover:bg-green-200';
                  break;
                case 'C3':
                  buttonClass += ' bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
                  break;
                case 'BL':
                  buttonClass += ' bg-red-100 text-red-700 hover:bg-red-200';
                  break;
                default:
                  buttonClass += ' bg-gray-100 text-gray-700 hover:bg-gray-200';
              }
            }
            
            return (
              <button
                key={key}
                onClick={() => setClassificationFilter(key as any)}
                className={buttonClass}
                style={buttonStyle}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">
                  {key === 'all' ? 'Tt' : 
                   key === 'SP' ? 'SP' : 
                   key === 'BL' ? 'BL' : 
                   label}
                </span>
              </button>
            );
          })}
          </div>
        </div>

        {/* Section 3: Mode d'exercice */}
        <div>
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Mode d'exercice</h4>
          <div className="flex gap-1 sm:gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Tous', icon: Search, color: 'gray' },
            { key: 'Individuel', label: 'Individuel', icon: User, color: 'blue' },
            { key: 'Collaborateur', label: 'Collaborateur', icon: UserCheck, color: 'orange' },
            { key: 'Associé', label: 'Associé', icon: Users, color: 'purple' }
          ].map(({ key, label, icon: Icon, color }) => {
            const isActive = exerciceFilter === key;
            
            let buttonStyle = {};
            let buttonClass = 'flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors';
            
            if (isActive) {
              switch (key) {
                case 'Individuel':
                  buttonStyle = { backgroundColor: '#3b82f6', color: 'white' };
                  break;
                case 'Collaborateur':
                  buttonStyle = { backgroundColor: '#f97316', color: 'white' };
                  break;
                case 'Associé':
                  buttonStyle = { backgroundColor: '#9333ea', color: 'white' };
                  break;
                default:
                  buttonClass += ' bg-gray-600 text-white';
              }
            } else {
              // Styles non-actifs avec couleurs spécifiques
              switch (key) {
                case 'Individuel':
                  buttonClass += ' bg-blue-100 text-blue-700 hover:bg-blue-200';
                  break;
                case 'Collaborateur':
                  buttonClass += ' bg-orange-100 text-orange-700 hover:bg-orange-200';
                  break;
                case 'Associé':
                  buttonClass += ' bg-purple-100 text-purple-700 hover:bg-purple-200';
                  break;
                default:
                  buttonClass += ' bg-gray-100 text-gray-700 hover:bg-gray-200';
              }
            }
            
            return (
              <button
                key={key}
                onClick={() => setExerciceFilter(key as any)}
                className={buttonClass}
                style={buttonStyle}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{key === 'all' ? 'Ts' : label}</span>
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {/* Résultats de recherche */}
      {showDropdown && showResults && results && (
        <div className="absolute top-full mt-2 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          
          {/* Header des résultats */}
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">
                {results.totalFound} résultat{results.totalFound > 1 ? 's' : ''}
              </h3>
              <span className="text-sm text-gray-500">
                {results.searchTime}ms
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Recherche: "{results.query}"
            </p>
          </div>

          {/* Résultats cabinets */}
          {results.cabinets.length > 0 && (
            <div className="p-2">
              <h4 className="text-sm font-medium text-gray-700 px-2 py-1 flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Cabinets ({results.cabinets.length})
              </h4>
              {results.cabinets.map((cabinet, index) => (
                <Link
                  key={index}
                  href={`/cabinet/${encodeURIComponent(cabinet.name)}`}
                  className="block p-3 hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => setShowResults(false)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{cabinet.name}</h5>
                      <p className="text-sm text-gray-600">
                        {cabinet.lawyer_count} avocat{cabinet.lawyer_count > 1 ? 's' : ''}
                      </p>
                      {cabinet.sample_lawyers.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Ex: {cabinet.sample_lawyers.map(l => l.nom_complet || l.prenomnom).slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cabinet.soutien_public_count > 0 && (
                        <span className="fn-badge fn-badge-sp text-xs px-2 py-1">
                          SP: {cabinet.soutien_public_count}
                        </span>
                      )}
                      {cabinet.c1_count > 0 && (
                        <span className="fn-badge fn-badge-c1 text-xs px-1 py-1">
                          C1: {cabinet.c1_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Résultats avocats */}
          {results.lawyers.length > 0 && (
            <div className="p-2 border-t">
              <h4 className="text-sm font-medium text-gray-700 px-2 py-1 flex items-center gap-1">
                <User className="h-4 w-4" />
                Avocats ({results.lawyers.length})
              </h4>
              {results.lawyers.map((lawyer, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {lawyer.photo_url ? (
                      <img
                        src={lawyer.photo_url}
                        alt={lawyer.nom_complet}
                        className="w-10 h-10 rounded-full object-cover bg-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-gray-900 truncate">
                          {lawyer.nom_complet || lawyer.prenomnom}
                        </h5>
                        {lawyer.soutien_public && (
                          <span className="fn-badge fn-badge-sp text-xs px-2 py-1">
                            SP
                          </span>
                        )}
                        {lawyer.classement && (
                          <span className={getClassementBadge(lawyer.classement)}>
                            {lawyer.classement}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 truncate">
                        {lawyer.cabinet === 'Individuel' ? 'Avocat en individuel' : lawyer.cabinet}
                      </p>
                      
                      {lawyer.statut_cabinet && (
                        <p className="text-xs text-blue-600">
                          {lawyer.statut_cabinet}
                        </p>
                      )}
                      
                      {lawyer.specialisations && lawyer.specialisations.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {lawyer.specialisations.slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Aucun résultat */}
          {results.totalFound === 0 && (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun résultat trouvé
              </h3>
              <p className="text-gray-600">
                Essayez avec d'autres mots-clés ou vérifiez l'orthographe
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}