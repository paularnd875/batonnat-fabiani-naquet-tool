/**
 * Système de cache mémoire avec TTL pour optimiser les performances
 * Réduit drastiquement les appels à Google Sheets API
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
  timestamp: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  cacheSize: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 10 * 60 * 1000; // 10 minutes par défaut
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    cacheSize: 0
  };

  /**
   * Stocke une valeur dans le cache avec TTL optionnel
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiryTime = Date.now() + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data,
      expiry: expiryTime,
      timestamp: Date.now()
    });

    this.stats.cacheSize = this.cache.size;
    
    console.log(`💾 Cache SET: ${key} (TTL: ${Math.round((ttl || this.defaultTTL) / 1000)}s, Size: ${this.stats.cacheSize})`);
  }

  /**
   * Récupère une valeur du cache si elle n'a pas expiré
   */
  get<T>(key: string): T | null {
    this.stats.totalRequests++;
    
    const entry = this.cache.get(key);
    
    if (!entry || entry.expiry < Date.now()) {
      // Nettoyer l'entrée expirée
      if (entry) {
        this.cache.delete(key);
        this.stats.cacheSize = this.cache.size;
      }
      
      this.stats.misses++;
      console.log(`💾 Cache MISS: ${key} (Hit rate: ${this.getHitRate()}%)`);
      return null;
    }

    this.stats.hits++;
    const ageSeconds = Math.round((Date.now() - entry.timestamp) / 1000);
    console.log(`💾 Cache HIT: ${key} (Age: ${ageSeconds}s, Hit rate: ${this.getHitRate()}%)`);
    
    return entry.data;
  }

  /**
   * Supprime une clé spécifique du cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.cacheSize = this.cache.size;
      console.log(`💾 Cache DELETE: ${key} (Size: ${this.stats.cacheSize})`);
    }
    return deleted;
  }

  /**
   * Vide complètement le cache
   */
  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.stats.cacheSize = 0;
    console.log(`💾 Cache CLEAR: ${previousSize} entrées supprimées`);
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    this.stats.cacheSize = this.cache.size;
    
    if (cleaned > 0) {
      console.log(`💾 Cache CLEANUP: ${cleaned} entrées expirées supprimées (Size: ${this.stats.cacheSize})`);
    }
    
    return cleaned;
  }

  /**
   * Vérifie si une clé existe et n'a pas expiré
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? entry.expiry >= Date.now() : false;
  }

  /**
   * Obtient les statistiques du cache
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Calcule le taux de succès du cache
   */
  private getHitRate(): number {
    if (this.stats.totalRequests === 0) return 0;
    return Math.round((this.stats.hits / this.stats.totalRequests) * 100);
  }

  /**
   * Obtient des informations détaillées sur le cache
   */
  getInfo(): any {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Math.round((Date.now() - entry.timestamp) / 1000),
      ttl: Math.round((entry.expiry - Date.now()) / 1000),
      expired: entry.expiry < Date.now()
    }));

    return {
      stats: this.getStats(),
      hitRate: this.getHitRate(),
      entries: entries.slice(0, 10), // Limiter à 10 pour debug
      totalEntries: entries.length
    };
  }
}

// Instance singleton du cache
export const memoryCache = new MemoryCache();

// Nettoyage automatique toutes les 5 minutes
if (typeof window === 'undefined') { // Côté serveur uniquement
  setInterval(() => {
    memoryCache.cleanup();
  }, 5 * 60 * 1000);
}

// Constantes pour les clés de cache
export const CACHE_KEYS = {
  LAWYERS_ALL: 'lawyers_all_data',
  FIRMS_STATS: 'firms_stats_live',
  ADMIN_STATS: 'admin_stats',
  CABINET_PREFIX: 'cabinet_',
  TEAM_MEMBERS: 'team_members'
} as const;

// TTL ULTRA-OPTIMISÉS pour performance maximale
export const CACHE_TTL = {
  LAWYERS: 4 * 60 * 60 * 1000,      // 4 heures (données source - Google Sheets très lent)
  STATS: 3 * 60 * 60 * 1000,        // 3 heures (statistiques calculées - plus long)
  CABINET: 2 * 60 * 60 * 1000,      // 2 heures (données cabinet - plus long)
  QUICK: 60 * 60 * 1000,            // 1 heure (données fréquentes - plus long)
  SHORT: 30 * 60 * 1000,            // 30 minutes (données dynamiques)
  ULTRA_LONG: 8 * 60 * 60 * 1000    // 8 heures (pour les données très stables)
} as const;