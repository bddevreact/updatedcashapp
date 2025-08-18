import { useState, useCallback } from 'react';

export function useEnergy(initialEnergy: number = 100, maxEnergy: number = 100) {
  const [energy, setEnergy] = useState(initialEnergy);

  const updateEnergy = useCallback((newEnergy: number) => {
    setEnergy(Math.max(0, Math.min(maxEnergy, newEnergy)));
  }, [maxEnergy]);

  const consumeEnergy = useCallback((amount: number = 1) => {
    if (energy >= amount) {
      setEnergy(prev => Math.max(0, prev - amount));
      return true;
    }
    return false;
  }, [energy]);

  const addEnergy = useCallback((amount: number) => {
    setEnergy(prev => Math.min(maxEnergy, prev + amount));
  }, [maxEnergy]);

  const isEnergyAvailable = useCallback((amount: number = 1) => {
    return energy >= amount;
  }, [energy]);

  return {
    energy,
    maxEnergy,
    updateEnergy,
    consumeEnergy,
    addEnergy,
    isEnergyAvailable
  };
}