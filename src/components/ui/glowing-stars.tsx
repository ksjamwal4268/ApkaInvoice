import React, { useEffect, useRef, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GlowingStarsBackgroundCard = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({
    x: -1,
    y: -1,
  });

  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - left,
      y: e.clientY - top,
    });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: -1, y: -1 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative w-full max-w-md h-auto min-h-[18rem] rounded-2xl border border-teal-500/30 bg-radial from-slate-900 via-slate-950 to-black p-5 sm:p-7 overflow-hidden shadow-2xl transition-all duration-300 hover:border-teal-400/60 hover:shadow-teal-500/10",
        className
      )}
    >
      <div className="absolute inset-0 pointer-events-none">
        <Illustration mousePosition={mousePosition} />
      </div>
      <div className="relative z-10 h-full flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
};

export const GlowingStarsTitle = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <h3
      className={cn(
        "text-lg sm:text-xl font-bold tracking-tight text-white",
        className
      )}
    >
      {children}
    </h3>
  );
};

export const GlowingStarsDescription = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <p
      className={cn(
        "text-xs sm:text-sm text-slate-300 leading-relaxed max-w-[20rem]",
        className
      )}
    >
      {children}
    </p>
  );
};

export const Illustration = ({
  mousePosition,
}: {
  mousePosition: { x: number; y: number };
}) => {
  const stars = 72;
  const columns = 12;
  const [glowingStars, setGlowingStars] = useState<number[]>([]);

  const highlightedColumns = Array.from({ length: columns }, (_, i) => i);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomStars = Array.from({ length: 7 }, () =>
        Math.floor(Math.random() * stars)
      );
      setGlowingStars(randomStars);
    }, 2500);

    return () => clearInterval(interval);
  }, [stars]);

  return (
    <div
      className="h-full w-full grid p-2 gap-y-3"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {Array.from({ length: stars }).map((_, starIdx) => {
        const isGlowing = glowingStars.includes(starIdx);
        return (
          <div
            key={`star-${starIdx}`}
            className="flex items-center justify-center relative"
          >
            <Star
              isGlowing={isGlowing}
              starIdx={starIdx}
              highlightedColumns={highlightedColumns}
              mousePosition={mousePosition}
            />
            {isGlowing && (
              <Glow
                mousePosition={mousePosition}
                starIdx={starIdx}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const Star = ({
  isGlowing,
  starIdx,
  mousePosition,
}: {
  isGlowing: boolean;
  starIdx: number;
  highlightedColumns: number[];
  mousePosition: { x: number; y: number };
}) => {
  const isNearMouse =
    mousePosition.x > 0 &&
    mousePosition.y > 0 &&
    (starIdx % 12) * 35 >= mousePosition.x - 70 &&
    (starIdx % 12) * 35 <= mousePosition.x + 70 &&
    Math.floor(starIdx / 12) * 30 >= mousePosition.y - 70 &&
    Math.floor(starIdx / 12) * 30 <= mousePosition.y + 70;

  const active = isGlowing || isNearMouse;

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "transition-all duration-700",
        active
          ? "scale-125 text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]"
          : "scale-75 text-slate-700/60"
      )}
    >
      <path
        d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
        fill="currentColor"
      />
    </svg>
  );
};

const Glow = ({
  mousePosition: _mousePosition,
  starIdx: _starIdx,
}: {
  mousePosition: { x: number; y: number };
  starIdx: number;
}) => {
  return (
    <div
      className="absolute w-6 h-6 rounded-full bg-teal-400/30 blur-sm pointer-events-none animate-pulse"
    />
  );
};

