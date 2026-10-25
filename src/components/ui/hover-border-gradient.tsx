"use client";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

export type HoverBorderGradientProps<T extends React.ElementType = "button"> = {
  as?: T;
  containerClassName?: string;
  className?: string;
  duration?: number;
  clockwise?: boolean;
  glowColor?: string;
  disabled?: boolean;
} & React.ComponentPropsWithoutRef<T>;

export function HoverBorderGradient<T extends React.ElementType = "button">({
  children,
  containerClassName,
  className,
  as,
  duration = 1,
  clockwise = true,
  glowColor = "#0d9488",
  disabled,
  ...props
}: HoverBorderGradientProps<T>) {
  const Tag = (as || "button") as React.ElementType;
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = (currentDirection: Direction): Direction => {
    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = clockwise
      ? (currentIndex - 1 + directions.length) % directions.length
      : (currentIndex + 1) % directions.length;
    return directions[nextIndex];
  };

  const movingMap: Record<Direction, string> = {
    TOP: `radial-gradient(30% 65% at 50% 0%, ${glowColor} 0%, rgba(255, 255, 255, 0) 100%)`,
    LEFT: `radial-gradient(22% 55% at 0% 50%, ${glowColor} 0%, rgba(255, 255, 255, 0) 100%)`,
    BOTTOM: `radial-gradient(30% 65% at 50% 100%, ${glowColor} 0%, rgba(255, 255, 255, 0) 100%)`,
    RIGHT: `radial-gradient(22% 55% at 100% 50%, ${glowColor} 0%, rgba(255, 255, 255, 0) 100%)`,
  };

  const highlight = `radial-gradient(85% 180% at 50% 50%, ${glowColor} 0%, rgba(255, 255, 255, 0) 100%)`;

  useEffect(() => {
    if (!hovered && !disabled) {
      const interval = setInterval(() => {
        setDirection((prevState) => rotateDirection(prevState));
      }, duration * 1000);
      return () => clearInterval(interval);
    }
  }, [hovered, duration, clockwise, disabled]);

  return (
    <Tag
      onMouseEnter={() => {
        if (!disabled) setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      className={cn(
        "relative flex rounded-full border border-slate-200/90 content-center bg-slate-100/50 hover:bg-slate-100/80 transition duration-300 items-center flex-col flex-nowrap gap-10 h-min justify-center overflow-visible p-px decoration-clone w-fit shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        containerClassName
      )}
      {...props}
    >
      <div
        className={cn(
          "w-auto text-slate-900 z-10 bg-white px-5 py-2.5 rounded-[inherit] transition-colors duration-200",
          className
        )}
      >
        {children}
      </div>
      <div
        className="flex-none inset-0 overflow-hidden absolute z-0 rounded-[inherit] transition-all duration-500 pointer-events-none"
        style={{
          filter: "blur(2.5px)",
          position: "absolute",
          width: "100%",
          height: "100%",
          background: hovered
            ? highlight
            : movingMap[direction],
        }}
      />
      <div className="bg-white absolute z-1 flex-none inset-[1.5px] rounded-[inherit] pointer-events-none" />
    </Tag>
  );
}

export const AceternityLogo = () => {
  return (
    <svg
      width="66"
      height="65"
      viewBox="0 0 66 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-3 w-3 text-black dark:text-white"
    >
      <path
        d="M8 8.05571C8 8.05571 54.9009 18.1782 57.8687 30.062C60.8365 41.9458 9.05432 57.4696 9.05432 57.4696"
        stroke="currentColor"
        strokeWidth="15"
        strokeMiterlimit="3.86874"
        strokeLinecap="round"
      />
    </svg>
  );
};

export function HoverBorderGradientDemo() {
  return (
    <div className="m-40 flex justify-center text-center">
      <HoverBorderGradient
        containerClassName="rounded-full"
        as="button"
        className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2"
      >
        <AceternityLogo />
        <span>Aceternity UI</span>
      </HoverBorderGradient>
    </div>
  );
}
