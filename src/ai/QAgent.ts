import { saveToLocalStorage, loadFromLocalStorage } from './storage';

interface PerformanceMetrics {
  episodeReward: number;
  episodeSteps: number;
  pillarsDestroyed: number;
  completionTime: number;
}

let agent_epsilon=0.5
export class QAgent {
  private qTable: Map<string, Map<string, number>>;
  private learningRate: number;
  private discountFactor: number;
  private epsilon: number;
  private actions: string[];
  private metrics: PerformanceMetrics[];
  private currentEpisode: PerformanceMetrics;
  private episodeCount: number;

  constructor() {
    this.qTable = new Map();
    this.learningRate = 0.1;
    this.discountFactor = 0.9;
    this.epsilon = agent_epsilon;
    this.actions = ['up', 'down', 'left', 'right', 'none'];
    this.metrics = [];
    this.episodeCount = 0;
    this.currentEpisode = this.initializeEpisodeMetrics();
    
    // Load previously learned Q-table if available
    this.loadProgress();
  }

  getMovingAverageMetrics(windowSize: number = 10) {
    const recentMetrics = this.metrics.slice(-windowSize);
    const averageReward = recentMetrics.reduce((sum, m) => sum + m.episodeReward, 0) / recentMetrics.length;
    const averageSteps = recentMetrics.reduce((sum, m) => sum + m.episodeSteps, 0) / recentMetrics.length;
    const averageTime = recentMetrics.reduce((sum, m) => sum + m.completionTime, 0) / recentMetrics.length;
    const averagePillars = recentMetrics.reduce((sum, m) => sum + m.pillarsDestroyed, 0) / recentMetrics.length;
  
    return { averageReward, averageSteps, averageTime, averagePillars };
  }
  
  private hasPerformancePlateau(windowSize: number = 10, threshold: number = 0.01): boolean {
    if (this.metrics.length < windowSize * 2) {
      // Not enough data to detect a plateau
      return false;
    }
  
    // Calculate moving averages for two consecutive windows
    const recentMetrics = this.metrics.slice(-windowSize);
    const previousMetrics = this.metrics.slice(-windowSize * 2, -windowSize);
  
    const recentAverageReward = recentMetrics.reduce((sum, m) => sum + m.episodeReward, 0) / recentMetrics.length;
    const previousAverageReward = previousMetrics.reduce((sum, m) => sum + m.episodeReward, 0) / previousMetrics.length;
  
    // Check if the improvement is below the threshold
    return Math.abs(recentAverageReward - previousAverageReward) < threshold;
  }
  
  private initializeEpisodeMetrics(): PerformanceMetrics {
    return {
      episodeReward: 0,
      episodeSteps: 0,
      pillarsDestroyed: 0,
      completionTime: 0
    };
  }

  private getState(position: [number, number, number], pillars: [number, number, number][]): string {
    const x = Math.round(position[0] * 2) / 2;
    const z = Math.round(position[2] * 2) / 2;
    
    let nearestPillar: [number, number, number] | null = null;
    let minDist = Infinity;
  
    console.log("Available pillars for state calculation:", pillars);
  
    for (const pillar of pillars) {
      const dist = Math.sqrt(
        Math.pow(position[0] - pillar[0], 2) + 
        Math.pow(position[2] - pillar[2], 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearestPillar = pillar;
      }
    }
  
    console.log('Nearest pillar:', nearestPillar);
  
    return nearestPillar 
      ? `${x},${z}:${nearestPillar[0]},${nearestPillar[2]}` 
      : `${x},${z}:none`;
  }
  

  private getQValue(state: string, action: string): number {
    if (!this.qTable.has(state)) {
      this.qTable.set(state, new Map());
    }
    const actionValues = this.qTable.get(state)!;
    if (!actionValues.has(action)) {
      actionValues.set(action, 0);
    }
    return actionValues.get(action)!;
  }

  private setQValue(state: string, action: string, value: number) {
    if (!this.qTable.has(state)) {
      this.qTable.set(state, new Map());
    }
    this.qTable.get(state)!.set(action, value);
  }

  chooseAction(position: [number, number, number], pillars: [number, number, number][]): string {
    const state = this.getState(position, pillars);
  
    // Slow down epsilon decay and set a minimum threshold
    this.epsilon = Math.max(0.2, this.epsilon * (1 - this.episodeCount / 10000)); // Minimum epsilon = 0.2
  
    // console.log("Current epsilon:", this.epsilon);
  
    if (Math.random() < this.epsilon) {
      const randomAction = this.actions[Math.floor(Math.random() * this.actions.length)];
      console.log("Exploring with random action:", randomAction);
      return randomAction;
    }
  
    let bestAction = 'none';
    let bestValue = -Infinity;
  
    for (const action of this.actions) {
      const value = this.getQValue(state, action);
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }
  
    console.log("Exploiting with best action:", bestAction);
    return bestAction;
  }
  
  

  learn(
    oldState: [number, number, number],
    action: string,
    reward: number,
    newState: [number, number, number],
    pillars: [number, number, number][]
  ) {
    const oldStateStr = this.getState(oldState, pillars);
    const newStateStr = this.getState(newState, pillars);

    // Update episode metrics
    this.currentEpisode.episodeReward += reward;
    this.currentEpisode.episodeSteps += 1;

    // Get current Q-value
    const currentQ = this.getQValue(oldStateStr, action);

    // Find max Q-value for next state
    let maxNextQ = -Infinity;
    for (const nextAction of this.actions) {
      const nextQ = this.getQValue(newStateStr, nextAction);
      maxNextQ = Math.max(maxNextQ, nextQ);
    }

    // Q-learning update rule
    const newQ = currentQ + this.learningRate * (
      reward + this.discountFactor * maxNextQ - currentQ
    );

    this.setQValue(oldStateStr, action, newQ);

    // Save progress periodically
    if (this.currentEpisode.episodeSteps % 100 === 0 || this.episodeCount % 10 === 0) {
      this.saveProgress();
    }
    
  }

  completeEpisode(success: boolean, timeElapsed: number) {
    this.currentEpisode.completionTime = timeElapsed;
    this.metrics.push({ ...this.currentEpisode });
    
    // Keep only last 100 episodes of metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    this.episodeCount++;
    this.currentEpisode = this.initializeEpisodeMetrics();
    this.saveProgress();
  }

  getPerformanceMetrics() {
    // console.log('Performance metrics called');
    if (this.metrics.length === 0) return null;

    const last10Episodes = this.metrics.slice(-10);
    const averageReward = last10Episodes.reduce((sum, m) => sum + m.episodeReward, 0) / last10Episodes.length;
    const averageSteps = last10Episodes.reduce((sum, m) => sum + m.episodeSteps, 0) / last10Episodes.length;
    const averageTime = last10Episodes.reduce((sum, m) => sum + m.completionTime, 0) / last10Episodes.length;

    return {
      episodeCount: this.episodeCount,
      averageReward,
      averageSteps,
      averageTime,
      epsilon: this.epsilon
    };
  }

  private saveProgress() {
    try {
      const data = {
        qTable: Array.from(this.qTable.entries()).map(([state, actions]) => [
          state,
          Array.from(actions.entries())
        ]),
        metrics: this.metrics,
        episodeCount: this.episodeCount
      };
      saveToLocalStorage('qagent_progress', data);
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  }
  

  private loadProgress() {
    const data = loadFromLocalStorage('qagent_progress');
    if (data) {
      this.qTable = new Map(
        data.qTable.map(([state, actions]: [string, [string, number][]]) => [
          state,
          new Map(actions)
        ])
      );
      this.metrics = data.metrics;
      this.episodeCount = data.episodeCount;
    }
  }

  recordPillarDestroyed() {
    this.currentEpisode.pillarsDestroyed += 1;
  }
}