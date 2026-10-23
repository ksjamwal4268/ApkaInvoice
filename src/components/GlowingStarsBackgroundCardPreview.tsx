import {
  GlowingStarsBackgroundCard,
  GlowingStarsDescription,
  GlowingStarsTitle,
} from "./ui/glowing-stars";
import { useNavigate } from "react-router-dom";

export function GlowingStarsBackgroundCardPreview() {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/dashboard")}
      className="flex items-center justify-center py-4 antialiased cursor-pointer group"
    >
      <GlowingStarsBackgroundCard className="border-teal-500/30 group-hover:border-teal-400 transition-all">
        <GlowingStarsTitle>Autonomous Cash Recovery</GlowingStarsTitle>
        <div className="flex items-end justify-between mt-4 gap-4">
          <GlowingStarsDescription>
            Document AI OCR & automated trilingual WhatsApp reminders. Predict cash shortfalls 8 weeks early.
          </GlowingStarsDescription>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 shrink-0 group-hover:bg-teal-500 group-hover:text-slate-950 transition-all shadow-md">
            <Icon />
          </div>
        </div>
      </GlowingStarsBackgroundCard>
    </div>
  );
}

const Icon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className="h-4 w-4 stroke-2 text-current"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
      />
    </svg>
  );
};

