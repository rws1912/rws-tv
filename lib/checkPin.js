"use client"

import { useEffect, useState } from 'react';

function checkPin() {
  if (typeof window === 'undefined') return false;
  
  const storedPin = localStorage.getItem('pin');
  if (storedPin === '1912') {
    return true;
  }

  const userPin = prompt('Please enter the PIN:');
  if (userPin === process.env.NEXT_PUBLIC_PIN) {
    localStorage.setItem('pin', '1912');
    return true;
  } else {
    alert('Incorrect PIN. Access denied.');
    return false;
  }
}

export function PinCheck({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (checkPin()) {
      setIsAuthorized(true);
    } 
  }, []);

  if (!isAuthorized) {
    return null; // or a loading indicator
  }

  return <>{children}</>;
}