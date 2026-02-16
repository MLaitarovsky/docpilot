"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConfidenceIndicatorProps {
  confidence: number;
}

function getColor(confidence: number) {
  if (confidence >= 0.85) return "bg-emerald-500";
  if (confidence >= 0.7) return "bg-amber-500";
  return "bg-red-500";
}

function getTrackColor(confidence: number) {
  if (confidence >= 0.85) return "bg-emerald-100";
  if (confidence >= 0.7) return "bg-amber-100";
  return "bg-red-100";
}

export function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  const pct = Math.round(confidence * 100);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5 cursor-default">
            <div
              className={`h-1.5 w-12 rounded-full ${getTrackColor(confidence)}`}
            >
              <div
                className={`h-full rounded-full ${getColor(confidence)} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{pct}% confidence</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
