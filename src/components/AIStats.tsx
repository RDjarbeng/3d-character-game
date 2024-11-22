import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface AIStatsProps {
  metrics: {
    episodeCount: number;
    averageReward: number;
    averageSteps: number;
    averageTime: number;
    epsilon: number;
  } | null;
}

export function AIStats({ metrics }: AIStatsProps) {
  if (!metrics) return null;

  return (
    <div className="absolute bottom-20 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
      <h3 className="text-lg font-bold mb-2">AI Performance</h3>
      <div className="space-y-1 text-sm">
        <p>Episodes: {metrics.episodeCount}</p>
        <p>Avg Reward: {metrics.averageReward.toFixed(2)}</p>
        <p>Avg Steps: {metrics.averageSteps.toFixed(0)}</p>
        <p>Avg Time: {(metrics.averageTime / 1000).toFixed(1)}s</p>
        <p>Exploration: {(metrics.epsilon * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}