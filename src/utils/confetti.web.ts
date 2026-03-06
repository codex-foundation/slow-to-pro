import confetti from 'canvas-confetti';

export function fireConfetti(x?: number, y?: number): void {
  // If position provided, use it; otherwise center of screen
  const origin = {
    x: x !== undefined ? x / window.innerWidth : 0.5,
    y: y !== undefined ? y / window.innerHeight : 0.5,
  };

  confetti({
    particleCount: 50,
    spread: 60,
    origin,
    colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#22c55e'],
    ticks: 200,
    gravity: 1.2,
    scalar: 1.2,
  });
}
