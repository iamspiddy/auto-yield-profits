import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfettiAnimationProps {
  trigger: boolean;
  onComplete?: () => void;
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({ 
  trigger, 
  onComplete 
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isActive, setIsActive] = useState(false);

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);
      createConfetti();
    }
  }, [trigger, isActive]);

  const createConfetti = () => {
    const newPieces: ConfettiPiece[] = [];
    const pieceCount = 50;

    for (let i = 0; i < pieceCount; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }

    setPieces(newPieces);
    animateConfetti();
  };

  const animateConfetti = () => {
    const animationDuration = 3000; // 3 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / animationDuration;

      setPieces(prevPieces => 
        prevPieces.map(piece => ({
          ...piece,
          x: piece.x + piece.vx,
          y: piece.y + piece.vy + progress * 2, // Gravity effect
          rotation: piece.rotation + piece.rotationSpeed,
          vy: piece.vy + 0.1 // Gravity acceleration
        }))
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsActive(false);
        setPieces([]);
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  };

  if (!isActive || pieces.length === 0) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: piece.x,
            top: piece.y,
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
            transform: `rotate(${piece.rotation}deg)`,
            transition: 'none'
          }}
        />
      ))}
    </div>,
    document.body
  );
};

export default ConfettiAnimation;
