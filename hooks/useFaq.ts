import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FaqItem } from '../types';

export function useFaq() {
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getFaq();
      setFaq(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load FAQ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { faq, loading, error, reload: load };
}
