'use client'

import React, { createContext, useState, useContext, useCallback } from 'react';

interface ModifiedTimeContextType {
  lastModifiedTime: Date | null;
  updateLastModifiedTime: (newTime: Date) => void;
}

const ModifiedTimeContext = createContext<ModifiedTimeContextType | undefined>(undefined);

export const ModifiedTimeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [lastModifiedTime, setLastModifiedTime] = useState<Date | null>(null);

  const updateLastModifiedTime = useCallback((newTime: Date) => {
    setLastModifiedTime(prevTime => 
      prevTime === null || newTime > prevTime ? newTime : prevTime
    );
  }, []);

  return (
    <ModifiedTimeContext.Provider value={{ lastModifiedTime, updateLastModifiedTime }}>
      {children}
    </ModifiedTimeContext.Provider>
  );
};

export const useModifiedTime = () => {
  const context = useContext(ModifiedTimeContext);
  if (context === undefined) {
    throw new Error('useModifiedTime must be used within a ModifiedTimeProvider');
  }
  return context;
};