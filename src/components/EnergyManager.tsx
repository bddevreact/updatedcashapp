import React, { useEffect, useCallback } from 'react';
import { Zap } from 'lucide-react';

interface Props {
  energy: number;
  maxEnergy: number;
  onEnergyUpdate: (newEnergy: number) => void;
  onEnergyDepleted: () => void;
}

export default function EnergyManager({ energy, maxEnergy, onEnergyUpdate, onEnergyDepleted }: Props) {
  // Energy regeneration rate (1 energy per 5 minutes)
  const REGEN_RATE = 1;
  const REGEN_INTERVAL = 300000; // 5 minutes in milliseconds

  // Energy consumption rate (1 energy per tap)
  const CONSUMPTION_RATE = 1;

  const regenerateEnergy = useCallback(() => {
    if (energy < maxEnergy) {
      const newEnergy = Math.min(maxEnergy, energy + REGEN_RATE);
      onEnergyUpdate(newEnergy);
    }
  }, [energy, maxEnergy, onEnergyUpdate]);

  const consumeEnergy = useCallback(() => {
    if (energy >= CONSUMPTION_RATE) {
      const newEnergy = energy - CONSUMPTION_RATE;
      onEnergyUpdate(newEnergy);
      
      if (newEnergy === 0) {
        onEnergyDepleted();
      }
      return true;
    }
    return false;
  }, [energy, onEnergyUpdate, onEnergyDepleted]);

  // Set up energy regeneration interval
  useEffect(() => {
    const interval = setInterval(regenerateEnergy, REGEN_INTERVAL);
    return () => clearInterval(interval);
  }, [regenerateEnergy]);

  // Save energy state to localStorage
  useEffect(() => {
    localStorage.setItem('energy', energy.toString());
    localStorage.setItem('lastEnergyUpdate', Date.now().toString());
  }, [energy]);

  // Load energy state from localStorage and calculate missed regeneration
  useEffect(() => {
    const savedEnergy = localStorage.getItem('energy');
    const lastUpdate = localStorage.getItem('lastEnergyUpdate');
    
    if (savedEnergy && lastUpdate) {
      const timeDiff = Date.now() - parseInt(lastUpdate);
      const missedRegens = Math.floor(timeDiff / REGEN_INTERVAL);
      const newEnergy = Math.min(maxEnergy, parseInt(savedEnergy) + (missedRegens * REGEN_RATE));
      onEnergyUpdate(newEnergy);
    }
  }, [maxEnergy, onEnergyUpdate]);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Zap className="w-4 h-4 text-yellow-500 mr-1" />
          <span className="text-gray-400">Energy</span>
        </div>
        <div className="flex items-center">
          <span className="text-purple-500 mr-2">{energy}/{maxEnergy}</span>
          {energy < 20 && (
            <button
              onClick={onEnergyDepleted}
              className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full"
            >
              Refill
            </button>
          )}
        </div>
      </div>
      <div className="bg-gray-800 h-3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            energy < 20
              ? 'bg-red-500 animate-pulse'
              : 'bg-gradient-to-r from-yellow-500 to-purple-500'
          }`}
          style={{ width: `${(energy / maxEnergy) * 100}%` }}
        />
      </div>
      {energy === 0 && (
        <div className="text-red-500 text-sm mt-1 text-center">
          No energy left! Purchase more to continue mining.
        </div>
      )}
    </div>
  );
}