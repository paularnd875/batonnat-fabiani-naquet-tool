'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createClient } from '@supabase/supabase-js';

interface Firm {
  name: string;
  lawyer_count: number;
  c1_count: number;
  c2_count: number;
  c3_count: number;
  bl_count: number;
  unclassified_count: number;
  participation_rate: number;
  assigned_count: number;
}

export default function Home() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFirms();
  }, []);

  const loadFirms = async () => {
    try {
      // Utilisons une API route plutôt qu'un accès direct Supabase côté client
      const response = await fetch('/api/firms');
      const data = await response.json();
      
      if (data.success) {
        setFirms(data.firms || []);
      } else {
        console.error('Erreur API:', data.error);
      }
    } catch (error) {
      console.error('Erreur chargement cabinets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFirms = firms.filter(firm => 
    firm.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatClassementBadge = (type: string, count: number) => {
    if (count === 0) return null;
    
    const variants = {
      C1: 'bg-green-600 text-white',
      C2: 'bg-green-400 text-white', 
      C3: 'bg-yellow-500 text-white',
      BL: 'bg-red-600 text-white'
    };

    return (
      <Badge className={variants[type as keyof typeof variants]}>
        {type}: {count}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Chargement des cabinets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Bâtonnat Fabiani-Naquet 2026</h1>
        <p className="text-xl text-gray-600">Descente de cabinet - {firms.length} cabinets</p>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <Input 
          placeholder="Rechercher un cabinet..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <Button variant="outline" asChild>
          <Link href="/admin">Admin</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/test">Test API</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredFirms.map((firm) => (
          <Card key={firm.name} className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href={`/cabinet/${encodeURIComponent(firm.name)}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-2">{firm.name}</CardTitle>
                    <CardDescription>
                      {firm.lawyer_count} avocat{firm.lawyer_count > 1 ? 's' : ''}
                      {firm.participation_rate > 0 && (
                        <span className="ml-2 text-sm">
                          • Taux participation: {(firm.participation_rate * 100).toFixed(1)}%
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">
                      {firm.assigned_count > 0 && (
                        <Badge variant="outline">
                          {firm.assigned_count} assigné{firm.assigned_count > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {formatClassementBadge('C1', firm.c1_count)}
                  {formatClassementBadge('C2', firm.c2_count)}
                  {formatClassementBadge('C3', firm.c3_count)}
                  {formatClassementBadge('BL', firm.bl_count)}
                  {firm.unclassified_count > 0 && (
                    <Badge variant="secondary">
                      Non classés: {firm.unclassified_count}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {filteredFirms.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun cabinet trouvé pour "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}
