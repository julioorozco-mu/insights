"use client";

import { useEffect, useState, useCallback } from "react";
import { supabaseClient } from "@/lib/supabase";

interface SupabaseQueryConfig {
  table: string;
  select?: string;
  filters?: Array<{ column: string; operator: string; value: any }>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
}

/**
 * Hook para consultas a Supabase (reemplazo de useFirestoreQuery)
 * 
 * @deprecated Usar directamente supabaseClient o los repositorios
 */
export function useFirestoreQuery<T = Record<string, unknown>>(config: SupabaseQueryConfig | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!config) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabaseClient
        .from(config.table)
        .select(config.select || '*');

      // Aplicar filtros
      if (config.filters) {
        for (const filter of config.filters) {
          query = query.filter(filter.column, filter.operator, filter.value);
        }
      }

      // Ordenar
      if (config.orderBy) {
        query = query.order(config.orderBy.column, { 
          ascending: config.orderBy.ascending ?? true 
        });
      }

      // Limitar
      if (config.limit) {
        query = query.limit(config.limit);
      }

      const { data: result, error: queryError } = await query;

      if (queryError) throw queryError;

      setData((result || []) as T[]);
      setError(null);
    } catch (err) {
      console.error("Supabase query error:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [config?.table, config?.select, JSON.stringify(config?.filters), JSON.stringify(config?.orderBy), config?.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Función para refrescar los datos
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh };
}

/**
 * Hook simplificado para Supabase (recomendado)
 */
export function useSupabaseQuery<T = Record<string, unknown>>(
  table: string,
  options?: {
    select?: string;
    eq?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let query = supabaseClient
          .from(table)
          .select(options?.select || '*');

        if (options?.eq) {
          for (const [key, value] of Object.entries(options.eq)) {
            query = query.eq(key, value);
          }
        }

        if (options?.orderBy) {
          query = query.order(options.orderBy.column, { 
            ascending: options.orderBy.ascending ?? true 
          });
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        const { data: result, error: queryError } = await query;

        if (queryError) throw queryError;

        setData((result || []) as T[]);
        setError(null);
      } catch (err) {
        console.error("Supabase query error:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [table, options?.select, JSON.stringify(options?.eq), JSON.stringify(options?.orderBy), options?.limit]);

  return { data, loading, error };
}
