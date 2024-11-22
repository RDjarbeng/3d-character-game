import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Character, characterList } from './components/Character';
import { Environment } from './components/Environment';
import { Controls } from './components/Controls';
import { ChevronLeft, ChevronRight, Trophy, Timer, Crown, Bot } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
        <p className="text-lg">Loading Scene...</p>
      </div>
    </div>
  );
}

function ErrorFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-red-500/50 backdrop-blur-sm rounded-lg p-4 text-white">
        <p className="text-lg">Something went wrong. Please try again.</p>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

interface HighScore {
  time: number;
  character: string;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function App() {
  const [selectedCharacter, setSelectedCharacter] = useState(0);
  const [score, setScore] = useState(0);
  const [destroyedPillars, setDestroyedPillars] = useState<[number, number, number][]>([]);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [startTime] = useState(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [highScores, setHighScores] = useState<Record<number, HighScore>>(() => {
    const saved = localStorage.getItem('highScores');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    if (!gameCompleted) {
      const timer = setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 100);
      return () => clearInterval(timer);
    }
  }, [startTime, gameCompleted]);

  const handlePillarDestroyed = useCallback((position: [number, number, number]) => {
    if (!destroyedPillars.some(p => 
      Math.abs(p[0] - position[0]) < 0.1 && 
      Math.abs(p[2] - position[2]) < 0.1
    )) {
      setDestroyedPillars(prev => [...prev, position]);
      setScore(prev => prev + 100);
    }
  }, [destroyedPillars]);

  useEffect(() => {
    if (destroyedPillars.length === 8 && !endTime) {
      const finalTime = Date.now() - startTime;
      setEndTime(finalTime);
      setGameCompleted(true);

      if (!highScores[selectedCharacter] || finalTime < highScores[selectedCharacter].time) {
        const newHighScores = {
          ...highScores,
          [selectedCharacter]: {
            time: finalTime,
            character: characterList[selectedCharacter].name
          }
        };
        setHighScores(newHighScores);
        localStorage.setItem('highScores', JSON.stringify(newHighScores));
      }
    }
  }, [destroyedPillars, endTime, startTime, selectedCharacter, highScores]);

  const displayTime = endTime || currentTime;

  return (
    <div className="w-full h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Character Selection UI */}
      <div 
        className={`absolute top-0 left-0 right-0 z-10 p-4 transition-transform duration-300 ${
          showCharacterSelect ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-md mx-auto bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (!gameCompleted && selectedCharacter > 0) {
                  setSelectedCharacter(prev => prev - 1);
                }
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Previous character"
              disabled={gameCompleted}
            >
              <ChevronLeft className="text-white" size={24} />
            </button>
            <h2 className="text-xl font-bold text-white">{characterList[selectedCharacter].name}</h2>
            <button
              onClick={() => {
                if (!gameCompleted && selectedCharacter < characterList.length - 1) {
                  setSelectedCharacter(prev => prev + 1);
                }
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Next character"
              disabled={gameCompleted}
            >
              <ChevronRight className="text-white" size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Character Selection Button */}
      <button
        onClick={() => setShowCharacterSelect(prev => !prev)}
        className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/10 transition-colors"
        aria-label="Toggle character selection"
      >
        {showCharacterSelect ? '↑' : '↓'}
      </button>

      {/* AI Control Toggle */}
      <button
        onClick={() => setIsAIPlaying(prev => !prev)}
        className="absolute top-4 right-16 z-20 bg-black/50 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/10 transition-colors"
        aria-label="Toggle AI control"
        disabled={gameCompleted}
      >
        <Bot className={isAIPlaying ? "text-green-400" : "text-white"} size={24} />
      </button>

      {/* Score and Timer Display */}
      <div className="absolute top-4 left-4 z-10">
        <div className="space-y-2">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
            <p className="text-2xl font-bold">Score: {score}</p>
            <p className="text-sm">Pillars: {destroyedPillars.length} / 8</p>
          </div>
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              <p className="text-xl font-mono">{formatTime(displayTime)}</p>
            </div>
            {highScores[selectedCharacter] && (
              <div className="flex items-center gap-2 mt-1 text-yellow-400">
                <Crown className="w-4 h-4" />
                <p className="text-sm">Best: {formatTime(highScores[selectedCharacter].time)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Complete Modal */}
      {gameCompleted && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-black/80 backdrop-blur-md rounded-lg p-8 text-white text-center max-w-md mx-4">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h2 className="text-3xl font-bold mb-4">Victory!</h2>
            <p className="text-xl mb-2">Final Score: {score}</p>
            <p className="text-xl mb-4">Time: {formatTime(endTime!)}</p>
            {highScores[selectedCharacter] && endTime === highScores[selectedCharacter].time && (
              <p className="text-yellow-400 mb-4">New Record! 🎉</p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <ErrorBoundary>
        <Canvas shadows camera={{ position: [-8, 8, 8], fov: 50 }}>
          <Suspense fallback={null}>
            <Character
              index={selectedCharacter}
              position={[0, 0, 0]}
              onPillarDestroyed={handlePillarDestroyed}
              isAI={isAIPlaying}
            />
            <Environment
              destroyedPillars={destroyedPillars}
              onPillarDestroyed={handlePillarDestroyed}
              triggerExplosion={true}
            />
            <Controls />
          </Suspense>
        </Canvas>
      </ErrorBoundary>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 text-white text-center">
        <div className="max-w-md mx-auto bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <p className="text-sm">
            Use arrow keys to move • Mouse to orbit • Scroll to zoom
            <br />
            <span className="text-yellow-400">Destroy all pillars to win!</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;