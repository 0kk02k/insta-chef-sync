import React, { useMemo } from 'react';
import './SteamEffect.css';

interface SteamParticle {
  id: number;
  x: number;
  delay: number;
  scale: number;
}

export const SteamEffect: React.FC = () => {
  // Generate particles distributed across full width
  const particles = useMemo(() => {
    const p: SteamParticle[] = [];
    const particleCount = 24; // Mehr Partikel

    for (let i = 0; i < particleCount; i++) {
      p.push({
        id: i,
        x: (Math.random() - 0.5) * window.innerWidth * 0.8, // Verteilt über 80% der Breite
        delay: Math.random() * 6,
        scale: 0.7 + Math.random() * 0.4
      });
    }
    return p;
  }, []);

  return (
    <div className="steam-container">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="steam-particle"
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
