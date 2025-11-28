"use client";

import { useEffect, useState } from "react";
import { Query, onSnapshot, DocumentData } from "firebase/firestore";

export function useFirestoreQuery<T = DocumentData>(query: Query | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(results);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore query error:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
