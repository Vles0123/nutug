import { useEffect, useState } from 'react';
import { currentDate } from '../shared/calendar.mjs';

export function useToday(zone) {
  const [today, setToday] = useState(() => currentDate(zone));
  useEffect(() => {
    const refresh = () => setToday(currentDate(zone));
    refresh();
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [zone]);
  return today;
}
