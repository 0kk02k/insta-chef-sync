import React, { useMemo } from 'react';
import './SteamEffect.css';

interface SteamParticle {
  id: number;
  x: number;
  delay: number;
  scale: number;
  direction: 'up' | 'down';
}

export const SteamEffect: React.FC = () => {
  // Generate particles from center, half going up, half going down
  const particles = useMemo(() => {
    const p: SteamParticle[] = [];
    const particleCount = 24;

    for (let i = 0; i < particleCount; i++) {
      p.push({
        id: i,
        x: (Math.random() - 0.5) * Math.min(600, window.innerWidth * 0.6),
        delay: Math.random() * 6,
        scale: 0.7 + Math.random() * 0.4,
        direction: i % 2 === 0 ? 'up' : 'down'
      });
    }
    return p;
  }, []);

  return (
    <div className="steam-container">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`steam-particle steam-${particle.direction}`}
          style={{
            left: `calc(50% + ${particle.x}px)`,
            animationDelay: `${particle.delay}s`,
            transform: `scale(${particle.scale})`
          }}
        />
      ))}
    </div>
  );
};
