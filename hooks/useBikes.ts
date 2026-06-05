// hooks/useBikes.ts
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Bike } from '../types';

export function useBikes() {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api.getBikes();
      setBikes(data.filter((bike) => bike.active));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { bikes, loading, reload: load };
}