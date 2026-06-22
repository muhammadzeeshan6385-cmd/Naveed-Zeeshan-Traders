import { useEffect, useState } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/storage';
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => loadFromStorage(key, initialValue));
  useEffect(() => {
    saveToStorage(key, value);
  }, [key, value]);
  return [value, setValue];
}