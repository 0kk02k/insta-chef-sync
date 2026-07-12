import { useState, useEffect } from 'react';

export function useScrollPosition(threshold = 10) {
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const updateScroll = () => {
      const scrolled = window.scrollY > threshold;
      console.log('ScrollY:', window.scrollY, 'AtTop:', !scrolled, 'Threshold:', threshold);
      setAtTop(!scrolled);
    };

    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, [threshold]);

  return atTop;
}
