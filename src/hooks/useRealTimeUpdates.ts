import { useEffect, useRef, useState } from 'react';
import { useFirebaseUserStore } from '../store/firebaseUserStore';

interface RealTimeUpdateOptions {
  interval?: number; // Update interval in milliseconds
  autoStart?: boolean; // Whether to start updates automatically
  onUpdate?: () => void; // Callback when data updates
  onError?: (error: Error) => void; // Error callback
}

export function useRealTimeUpdates(options: RealTimeUpdateOptions = {}) {
  const {
    interval = 30000, // Default: 30 seconds
    autoStart = true,
    onUpdate,
    onError
  } = options;

  const { updateRealTimeStats } = useFirebaseUserStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  const startUpdates = () => {
    if (isActiveRef.current) return;
    
    isActiveRef.current = true;
    intervalRef.current = setInterval(async () => {
      try {
        setIsUpdating(true);
        setError(null);
        
        await updateRealTimeStats();
        setLastUpdate(new Date());
        
        if (onUpdate) {
          onUpdate();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        
        if (onError) {
          onError(error);
        }
      } finally {
        setIsUpdating(false);
      }
    }, interval);
  };

  const stopUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isActiveRef.current = false;
  };

  const forceUpdate = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      
      await updateRealTimeStats();
      setLastUpdate(new Date());
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (autoStart) {
      startUpdates();
    }

    return () => {
      stopUpdates();
    };
  }, [autoStart, interval]);

  return {
    isUpdating,
    lastUpdate,
    error,
    startUpdates,
    stopUpdates,
    forceUpdate
  };
}

// Hook for specific data types
export function useReferralUpdates(options: RealTimeUpdateOptions = {}) {
  const { onUpdate, ...restOptions } = options;
  
  return useRealTimeUpdates({
    ...restOptions,
    onUpdate: () => {
      // Custom logic for referral updates
      if (onUpdate) onUpdate();
    }
  });
}

export function useTaskUpdates(options: RealTimeUpdateOptions = {}) {
  const { onUpdate, ...restOptions } = options;
  
  return useRealTimeUpdates({
    ...restOptions,
    onUpdate: () => {
      // Custom logic for task updates
      if (onUpdate) onUpdate();
    }
  });
}

export function useBalanceUpdates(options: RealTimeUpdateOptions = {}) {
  const { onUpdate, ...restOptions } = options;
  
  return useRealTimeUpdates({
    ...restOptions,
    onUpdate: () => {
      // Custom logic for balance updates
      if (onUpdate) onUpdate();
    }
  });
} 