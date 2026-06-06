// hooks/useBikes.ts
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Bike } from '../types';

function readMetaValue(description: string, key: string) {
  const pattern = new RegExp(`^\\s*${key}\\s*[:=]\\s*(.+?)\\s*$`, 'im');
  return description.match(pattern)?.[1]?.trim() ?? '';
}

function cleanDescription(description: string) {
  return description
    .split(/\r?\n/)
    .filter((line) => !/^\s*(price_per_day|price per day|quantity|active)\s*[:=]/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeBike(bike: Bike): Bike {
  const description = bike.description ?? '';
  const priceFromDescription = readMetaValue(description, 'price(?:_per_day| per day)');
  const quantityFromDescription = readMetaValue(description, 'quantity');
  const activeFromDescription = readMetaValue(description, 'active');

  return {
    ...bike,
    description: cleanDescription(description),
    price_per_day: bike.price_per_day || priceFromDescription,
    quantity: bike.quantity || quantityFromDescription,
    active: bike.active && !/^0|false|no$/i.test(activeFromDescription),
  };
}

export function useBikes() {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api.getBikes();
      setBikes(data.map(normalizeBike).filter((bike) => bike.active));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { bikes, loading, reload: load };
}
