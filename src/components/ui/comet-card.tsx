"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface CometCardProps {
  rotateDepth?: number;
  translateDepth?: number;
  className?: string;
  children: React.ReactNode;
}

export const CometCard = ({
  rotateDepth = 15,
  translateDepth = 15,
  className,
  children,
}: CometCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Position state normalized [-0.5, 0.5]
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);

  const [cardStyle, setCardStyle] = useState({
    transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0px, 0px, 0px) scale3d(1, 1, 1)",
    glareX: 50,
    glareY: 50,
    glareOpacity: 0,
  });

  const animate = useCallback(() => {
    // Smooth lerp (spring-like damping)
    const factor = 0.12;
    currentPos.current.x += (targetPos.current.x - currentPos.current.x) * factor;
    currentPos.current.y += (targetPos.current.y - currentPos.current.y) * factor;

    const curX = currentPos.current.x;
    const curY = currentPos.current.y;

    const rotX = -curY * rotateDepth * 2;
    const rotY = curX * rotateDepth * 2;
    const transX = curX * translateDepth * 2;
    const transY = -curY * translateDepth * 2;
    const scale = isHovered ? 1.025 : 1;

    const gX = (curX + 0.5) * 100;
    const gY = (curY + 0.5) * 100;

    setCardStyle({
      transform: `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translate3d(${transX.toFixed(1)}px, ${transY.toFixed(1)}px, ${isHovered ? "20px" : "0px"}) scale3d(${scale}, ${scale}, 1)`,
      glareX: gX,
      glareY: gY,
      glareOpacity: isHovered ? 0.45 : 0,
    });

    const isSettled =
      Math.abs(targetPos.current.x - curX) < 0.001 &&
      Math.abs(targetPos.current.y - curY) < 0.001;

    if (!isSettled || isHovered) {
      rafId.current = requestAnimationFrame(animate);
    } else {
      rafId.current = null;
    }
  }, [rotateDepth, translateDepth, isHovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = Math.max(-0.5, Math.min(0.5, mouseX / width - 0.5));
    const yPct = Math.max(-0.5, Math.min(0.5, mouseY / height - 0.5));

    targetPos.current = { x: xPct, y: yPct };

    if (!rafId.current) {
      rafId.current = requestAnimationFrame(animate);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(animate);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    targetPos.current = { x: 0, y: 0 };
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("relative transition-shadow duration-300 transform-gpu", className)}
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="w-full h-full relative rounded-2xl will-change-transform"
        style={{
          transform: cardStyle.transform,
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? "rgba(0, 0, 0, 0.04) 0px 30px 60px 0px, rgba(15, 118, 110, 0.12) 0px 12px 30px 0px, rgba(0, 0, 0, 0.08) 0px 4px 10px 0px"
            : "rgba(0, 0, 0, 0.03) 0px 10px 25px 0px, rgba(0, 0, 0, 0.04) 0px 2px 6px 0px",
          transition: isHovered ? "box-shadow 0.25s ease-out" : "box-shadow 0.4s ease-out",
        }}
      >
        {children}

        {/* Ambient Comet Glare Highlight */}
        <div
          className="pointer-events-none absolute inset-0 z-20 h-full w-full rounded-2xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${cardStyle.glareX}% ${cardStyle.glareY}%, rgba(255, 255, 255, 0.85) 5%, rgba(255, 255, 255, 0.35) 25%, rgba(255, 255, 255, 0) 70%)`,
            opacity: cardStyle.glareOpacity,
            mixBlendMode: "overlay",
          }}
        />
      </div>
    </div>
  );
};

export function CometCardDemo() {
  return (
    <CometCard>
      <button
        type="button"
        className="my-10 flex w-80 cursor-pointer flex-col items-stretch rounded-[16px] border-0 bg-[#1F2121] p-2 saturate-0 md:my-20 md:p-4"
        aria-label="View invite F7RA"
        style={{
          transformStyle: "preserve-3d",
          transform: "none",
          opacity: 1,
        }}
      >
        <div className="mx-2 flex-1">
          <div className="relative mt-2 aspect-[3/4] w-full">
            <img
              loading="lazy"
              className="absolute inset-0 h-full w-full rounded-[16px] bg-[#000000] object-cover contrast-75"
              alt="Invite background"
              src="https://images.unsplash.com/photo-1505506874110-6a7a69069a08?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              style={{
                boxShadow: "rgba(0, 0, 0, 0.05) 0px 5px 6px 0px",
                opacity: 1,
              }}
            />
          </div>
        </div>
        <div className="mt-2 flex flex-shrink-0 items-center justify-between p-4 font-mono text-white">
          <div className="text-xs">Comet Invitation</div>
          <div className="text-xs text-gray-300 opacity-50">#F7RA</div>
        </div>
      </button>
    </CometCard>
  );
}

