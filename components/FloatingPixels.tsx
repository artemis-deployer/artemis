import React from 'react';

const pixelData: [number, number, number, number][] = [
  [0, 0, 41, 20], [6, 0, 10, 69], [9, 0, 35, 10], [15.6, 4, 31, 140],
  [3.2, 17, 36, 44], [0, 24, 41, 68], [3.2, 35, 36, 38], [9.6, 39, 77, 46],
  [18, 41, 25, 3], [6, 55, 10, 10], [15.6, 59, 31, 32], [6.8, 70, 40, 25],
  [9.6, 70, 77, 68], [18, 65, 26, 72], [82, 0, 31, 16], [82, 4, 31, 69],
  [80, 16, 25, 25], [84.4, 20, 77, 35], [82, 28, 31, 31], [93.2, 11, 10, 34],
  [94, 0, 36, 51], [97, 11, 41, 13], [94, 17, 36, 51], [97, 23, 41, 69],
  [90.4, 30, 36, 8], [93.2, 40, 10, 84], [80, 47, 26, 36], [84.4, 57, 77, 9],
  [82, 62, 31, 80], [93.2, 63, 30, 11], [97, 57, 41, 60], [84.4, 70, 77, 25],
  [82, 78, 36, 20]
];

const colors = ['#e5c0ef', '#afddfa', '#f1d4ef', '#aa83ee'];

export const FloatingPixels: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pixels ${className}`} aria-hidden="true">
      {pixelData.map((p, i) => (
        <i
          key={i}
          className="pixel"
          style={{
            ['--x' as string]: `${p[0]}%`,
            ['--y' as string]: `${p[1]}%`,
            ['--w' as string]: `${p[2]}px`,
            ['--h' as string]: `${p[3]}px`,
            ['--color' as string]: colors[i % colors.length],
            ['--delay' as string]: `-${i * 0.37}s`
          }}
        />
      ))}
    </div>
  );
};
