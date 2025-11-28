"use client";

import { useState, useEffect } from "react";
import { PollResults } from "@/types/poll";
import { IconChartBar, IconClock } from "@tabler/icons-react";

interface PollResultsPanelProps {
  polls: PollResults[];
}

export default function PollResultsPanel({ polls }: PollResultsPanelProps) {
  const [pollTimers, setPollTimers] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const intervals: { [key: string]: NodeJS.Timeout } = {};

    polls.forEach((poll) => {
      if (poll.isActive) {
        const updateTimer = () => {
          const now = new Date().getTime();
          const expires = new Date(poll.expiresAt).getTime();
          const timeLeft = Math.max(0, Math.floor((expires - now) / 1000));
          setPollTimers((prev) => ({ ...prev, [poll.pollId]: timeLeft }));
        };

        updateTimer();
        intervals[poll.pollId] = setInterval(updateTimer, 1000);
      }
    });

    return () => {
      Object.values(intervals).forEach((interval) => clearInterval(interval));
    };
  }, [polls]);

  if (polls.length === 0) {
    return (
      <div className="text-center py-4 text-base-content/50">
        <IconChartBar size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-xs">No hay encuestas aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {polls.map((poll) => {
        const timeLeft = pollTimers[poll.pollId] || 0;
        
        return (
          <div
            key={poll.pollId}
            className={`card bg-base-200 shadow-sm ${poll.isActive ? "border-2 border-primary" : "border border-base-300"}`}
          >
            <div className="card-body p-3">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-xs flex-1">{poll.question}</h4>
                {poll.isActive && (
                  <div className="badge badge-primary badge-sm gap-1">
                    <IconClock size={10} />
                    {timeLeft}s
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                {poll.responses.map((response, index) => (
                  <div key={index} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{response.option}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-base-content/70">{response.count || 0}</span>
                        <span className="font-bold text-primary">{(response.percentage || 0).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-base-300 rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${response.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-base-content/70 mt-2">
                Total: <span className="font-bold">{poll.totalResponses || 0}</span> respuestas
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
