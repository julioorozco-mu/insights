"use client";

import { useState, useEffect } from "react";
import { IconClock } from "@tabler/icons-react";
import { PollResults } from "@/types/poll";

interface ActivePollProps {
  pollId: string;
  question: string;
  options: string[];
  expiresAt: Date;
  duration: number;
  onVote: (optionIndex: number) => void;
  results?: PollResults;
  hasVoted: boolean;
}

export default function ActivePoll({
  pollId,
  question,
  options,
  expiresAt,
  duration,
  onVote,
  results,
  hasVoted,
}: ActivePollProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleVote = (index: number) => {
    if (!hasVoted && timeLeft > 0) {
      setSelectedOption(index);
      onVote(index);
    }
  };

  const getPercentage = (optionIndex: number): number => {
    if (!results || results.totalResponses === 0) return 0;
    const response = results.responses[optionIndex];
    return response ? response.percentage : 0;
  };

  const getCount = (optionIndex: number): number => {
    if (!results) return 0;
    const response = results.responses[optionIndex];
    return response ? response.count : 0;
  };

  return (
    <div className="bg-primary/10 border-2 border-primary rounded-lg p-3">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-sm">{question}</h3>
        <div className="badge badge-primary badge-sm gap-1">
          <IconClock size={12} />
          {timeLeft}s
        </div>
      </div>

      {/* Barra de progreso del tiempo */}
      <div className="w-full bg-base-300 rounded-full h-1 mb-3">
        <div
          className="bg-primary h-1 rounded-full transition-all duration-1000"
          style={{ 
            width: `${duration ? (timeLeft / duration) * 100 : 0}%` 
          }}
        />
      </div>

      <div className="space-y-1.5">
        {options.map((option, index) => {
          const percentage = getPercentage(index);
          const count = getCount(index);
          const isSelected = selectedOption === index;

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={hasVoted || timeLeft === 0}
              className={`w-full text-left relative overflow-hidden rounded border-2 transition-all ${
                hasVoted
                  ? isSelected
                    ? "border-primary bg-primary/20"
                    : "border-base-300 bg-base-200"
                  : "border-base-300 hover:border-primary hover:bg-base-200"
              } ${hasVoted || timeLeft === 0 ? "cursor-default" : "cursor-pointer"}`}
            >
              {/* Barra de progreso */}
              {hasVoted && (
                <div
                  className="absolute inset-0 bg-primary/20 transition-all duration-500"
                  style={{ width: `${percentage || 0}%` }}
                />
              )}

              {/* Contenido */}
              <div className="relative p-2 flex items-center justify-between">
                <span className={`text-sm font-semibold ${isSelected ? "text-primary" : ""}`}>
                  {option}
                </span>
                {hasVoted && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-base-content/70">{count || 0}</span>
                    <span className="text-xs font-bold text-primary">{(percentage || 0).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {hasVoted && results && (
        <div className="mt-2 text-xs text-center text-base-content/70">
          Total: {results.totalResponses} respuestas
        </div>
      )}

      {timeLeft === 0 && !hasVoted && (
        <div className="mt-2 text-xs text-center text-error font-semibold flex items-center justify-center gap-1">
          <IconClock size={12} />
          Tiempo agotado
        </div>
      )}
    </div>
  );
}
