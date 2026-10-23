import React from "react";

/** GlowingStarsBackgroundCardPreview - A background component featuring glowing stars */
export const GlowingStarsBackgroundCardPreview = () => {
  return (
    <div className="fixed inset-0 top-0 left-0 right-0 w-full h-full bg-black/30 backdrop-blur-sm z-10">
      <div className="absolute inset-0" />
      <div className="relative z-10 min-h-full flex items-center justify-center pt-20">
        <div className="inline-block animate-bounce">
          <svg className="w-16 h-16 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0-2C-2.761 0 0 2.735 0 5.996s2.735 5.996 5.996 5.996 5.996-2.735 5.996-5.996S15.761 0 12 0zm0 9.5c-3.375 0-6.125 2.75-6.125 6.125s2.75 6.125 6.125 6.125 6.125-2.75 6.125-6.125S15.375 9.5 12 9.5zm0 5.5c-2.073 0-3.75 1.677-3.75 3.75s1.677 3.75 3.75 3.75 3.75-1.677 3.75-3.75S14.073 10.5 12 10.5zM12 20c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10S6.477 20 12 20zm0-5.5c1.875 0 3.438-1.125 3.906-2.719l3.188-5.313-5.438 1.813c.219-.063.375-.25.375-.563 0-1.875-1.5-3.375-3.375-3.375-1.125 0-2.188.313-3.188.813l-5.313 3.188c-1.438 2.688-2.813 5.063-4.313 7.063L12 25.5z" />
          </svg>
        </div>
        <p className="mt-4 text-sm text-slate-300">Glowing Stars</p>
      </div>
    </div>
  );
};
