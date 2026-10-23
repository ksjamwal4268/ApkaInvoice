import React, { useEffect, useState, useMemo } from "react";

interface StarPoint {
  id: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number; // px
  baseOpacity: number;
  duration: number; // seconds
  delay: number; // seconds
  color: "cyan" | "white" | "teal" | "gold";
}

export function GlowingStarsBackground({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: -1000,
    y: -1000,
  });

  // Generate a realistic field of 120 cosmic glowing stars
  const stars: StarPoint[] = useMemo(() => {
    const list: StarPoint[] = [];
    const colors: StarPoint["color"][] = ["cyan", "white", "teal", "cyan", "white"];

    for (let i = 0; i < 110; i++) {
      list.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() < 0.2 ? 14 : Math.random() < 0.5 ? 9 : 5,
        baseOpacity: 0.2 + Math.random() * 0.45,
        duration: 2.5 + Math.random() * 4,
        delay: Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return list;
  }, []);

  useEffect(() => {
    let ticking = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setMousePos({ x: e.clientX, y: e.clientY });
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleMouseLeave = () => {
      setMousePos({ x: -1000, y: -1000 });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className={`relative min-h-screen w-full overflow-hidden ${className}`}>
      {/* Background Starry Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-950">
        {/* Soft Cosmic Ambient Glows */}
        <div className="absolute top-0 left-1/4 w-[38rem] h-[38rem] rounded-full bg-teal-600/10 blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[32rem] h-[32rem] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute top-2/3 left-1/3 w-[26rem] h-[26rem] rounded-full bg-teal-500/8 blur-[100px]" />

        {/* Interactive Radial Follower */}
        {mousePos.x > 0 && (
          <div
            className="absolute rounded-full pointer-events-none transition-transform duration-75 ease-out"
            style={{
              width: "360px",
              height: "360px",
              left: `${mousePos.x - 180}px`,
              top: `${mousePos.y - 180}px`,
              background:
                "radial-gradient(circle, rgba(45, 212, 191, 0.12) 0%, rgba(20, 184, 166, 0.04) 45%, transparent 70%)",
            }}
          />
        )}

        {/* Field of 110 Twinkling & Glowing Stars */}
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {stars.map((star) => {
            const starColor =
              star.color === "cyan"
                ? "#2dd4bf"
                : star.color === "teal"
                ? "#14b8a6"
                : star.color === "gold"
                ? "#fbbf24"
                : "#f8fafc";

            return (
              <g
                key={star.id}
                style={{
                  transform: `translate(${star.x}vw, ${star.y}vh)`,
                  transformOrigin: "center",
                }}
              >
                {/* 4-point glowing star shape */}
                <path
                  d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z"
                  fill={starColor}
                  className="animate-pulse"
                  style={{
                    animationDuration: `${star.duration}s`,
                    animationDelay: `${star.delay}s`,
                    transform: `scale(${star.size / 6})`,
                    opacity: star.baseOpacity,
                    filter:
                      star.size > 8
                        ? `drop-shadow(0 0 6px ${starColor})`
                        : undefined,
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Page Content Container - Always on top and fully clickable */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}

