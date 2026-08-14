import { getTg, expandApp, setHeaderColor, setBackgroundColor } from './helpers/telegram';

export async function init(): Promise<void> {
  const tg = getTg();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#080d19');
      tg.setBackgroundColor('#080d19');
    } catch (e) {
      console.warn('[Init] Native WebApp setup warning:', e);
    }
  } else {
    expandApp();
    setHeaderColor('#080d19');
    setBackgroundColor('#080d19');
  }

  // Non-blocking background API warm up
  const apiUrl = import.meta.env.VITE_NODE_API_URL || 'https://abiyback.onrender.com';
  Promise.all([
    fetch(`${apiUrl}/services`),
    fetch(`${apiUrl}/categories`),
  ]).catch(() => { /* warm up only */ });
}
