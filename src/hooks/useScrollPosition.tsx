import { useState, useEffect } from 'react';

export function useScrollPosition(thresholdDown = 50, thresholdUp = 20) {
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    let lastScrollY = 0;

    const updateScroll = () => {
      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollY;

      // Hysterese: Unterschiedliche Thresholds für Scroll-Richtung
      if (delta > 0) {
        // Scrolling DOWN - höherer Threshold
        setAtTop(scrollY < thresholdDown);
      } else if (delta < 0) {
        // Scrolling UP - niedrigerer Threshold
        setAtTop(scrollY < thresholdUp);
      }

      lastScrollY = scrollY;
    };

    // Throttle mit requestAnimationFrame
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [thresholdDown, thresholdUp]);

  return atTop;
}
