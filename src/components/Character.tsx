import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { QAgent } from '../ai/QAgent';

const characters = [
  {
    name: 'Robot',
    Component: ({ position, rotation }: { position: [number, number, number], rotation: number }) => (
      <group position={position} rotation={[0, rotation, 0]}>
        <Box args={[1, 1.5, 1]} position={[0, 0.75, 0]} castShadow>
          <meshStandardMaterial color="#4a5568" />
        </Box>
        <Sphere args={[0.5, 32, 32]} position={[0, 1.5, 0]} castShadow>
          <meshStandardMaterial color="#4a5568" />
        </Sphere>
        <Box args={[0.4, 0.8, 0.4]} position={[-0.5, 0, 0]} castShadow>
          <meshStandardMaterial color="#4a5568" />
        </Box>
        <Box args={[0.4, 0.8, 0.4]} position={[0.5, 0, 0]} castShadow>
          <meshStandardMaterial color="#4a5568" />
        </Box>
      </group>
    ),
    radius: 0.75,
    speed: 0.2
  },
  {
    name: 'Rolling Alien',
    Component: ({ position }: { position: [number, number, number], rotation: number }) => (
      <Sphere args={[0.6, 32, 32]} position={[position[0], position[1] + 0.6, position[2]]} castShadow>
        <meshStandardMaterial color="#68d391" />
        <Sphere args={[0.2, 16, 16]} position={[0.4, 0.4, 0]} castShadow>
          <meshStandardMaterial color="#000000" />
        </Sphere>
      </Sphere>
    ),
    radius: 0.6,
    speed: 0.25
  }
];

interface CharacterProps {
  index: number;
  position: [number, number, number];
  onPillarDestroyed: (position: [number, number, number]) => void;
  isAI?: boolean;
}

export function Character({ index, position: initialPosition, onPillarDestroyed, isAI = false }: CharacterProps) {
  const groupRef = useRef<THREE.Group | THREE.Mesh>();
  const positionRef = useRef<[number, number, number]>([...initialPosition]);
  const velocityRef = useRef<[number, number, number]>([0, 0, 0]);
  const rotationRef = useRef(0);
  const SelectedCharacter = characters[index].Component;
  const characterRadius = characters[index].radius;
  const characterSpeed = characters[index].speed;
  const [agent] = useState(() => new QAgent());
  const lastPositionRef = useRef<[number, number, number]>([...initialPosition]);
  const lastActionRef = useRef<string>('none');

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.y = 0;
      groupRef.current.rotation.z = 0;
    }
  }, [index]);

  useEffect(() => {
    if (!isAI) {
      const handleKeyDown = (event: KeyboardEvent) => {
        switch (event.key) {
          case 'ArrowUp':
            velocityRef.current[2] = -characterSpeed;
            if (index === 0) rotationRef.current = Math.PI;
            break;
          case 'ArrowDown':
            velocityRef.current[2] = characterSpeed;
            if (index === 0) rotationRef.current = 0;
            break;
          case 'ArrowLeft':
            velocityRef.current[0] = -characterSpeed;
            if (index === 0) rotationRef.current = -Math.PI / 2;
            break;
          case 'ArrowRight':
            velocityRef.current[0] = characterSpeed;
            if (index === 0) rotationRef.current = Math.PI / 2;
            break;
        }
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        switch (event.key) {
          case 'ArrowUp':
          case 'ArrowDown':
            velocityRef.current[2] = 0;
            break;
          case 'ArrowLeft':
          case 'ArrowRight':
            velocityRef.current[0] = 0;
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [index, characterSpeed, isAI]);

  useFrame(() => {
    if (groupRef.current && isAI) {
      const pillars = getPillarPositions();
  
      // Choose action based on current state
      const action = agent.chooseAction(positionRef.current, pillars);
      console.log("Chosen action:", action);
  
      // Reset velocity
      velocityRef.current = [0, 0, 0];
  
      // Apply action
      switch (action) {
        case "up":
          velocityRef.current[2] = -characterSpeed;
          break;
        case "down":
          velocityRef.current[2] = characterSpeed;
          break;
        case "left":
          velocityRef.current[0] = -characterSpeed;
          break;
        case "right":
          velocityRef.current[0] = characterSpeed;
          break;
        default:
          break;
      }
  
      console.log("Velocity:", velocityRef.current);
  
      const nextPosition = [
        positionRef.current[0] + velocityRef.current[0],
        positionRef.current[1],
        positionRef.current[2] + velocityRef.current[2],
      ] as [number, number, number];
  
      // Calculate reward
      const reward = calculateReward(
        nextPosition,
        lastPositionRef.current,
        pillars
      );
      console.log("Reward:", reward);
  
      // Learn from previous state-action pair
      agent.learn(
        lastPositionRef.current,
        lastActionRef.current,
        reward,
        nextPosition,
        pillars
      );
  
      // Update references for next frame
      lastPositionRef.current = [...nextPosition];
      lastActionRef.current = action;
  
      positionRef.current = [
        Math.max(-4, Math.min(4, nextPosition[0])), // X-axis bounds
        nextPosition[1], // Y-axis remains unchanged
        Math.max(-4, Math.min(4, nextPosition[2])), // Z-axis bounds
      ];
      groupRef.current.position.set(...positionRef.current);
    }
  });
  
  
  
  

  return (
    <group ref={groupRef as any}>
      <SelectedCharacter position={[0, 0, 0]} rotation={rotationRef.current} />
    </group>
  );
}

function getPillarPositions(): [number, number, number][] {
  const positions: [number, number, number][] = [];
  const radius = 4;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    positions.push([x, 0.75, z]);
  }
  return positions;
}

function calculateReward(
  position: [number, number, number],
  lastPosition: [number, number, number],
  pillars: [number, number, number][]
): number {
  let reward = -0.1; // Small penalty for each step to encourage efficiency

  // Penalize staying in the same place
  if (
    Math.abs(position[0] - lastPosition[0]) < 0.01 &&
    Math.abs(position[2] - lastPosition[2]) < 0.01
  ) {
    reward -= 0.5; // Larger penalty for no movement
    console.log("Penalty for no movement");
  }

  // Check if colliding with any pillar
  for (const pillar of pillars) {
    const dx = position[0] - pillar[0];
    const dz = position[2] - pillar[2];
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 0.5) { // Collision threshold
      reward += 10; // Large reward for destroying a pillar
      console.log("High reward for colliding with pillar");
      return reward; // Exit early since we collided
    }
  }

  // Reward or penalize based on distance to nearest pillar
  let minDist = Infinity;
  let lastMinDist = Infinity;

  for (const pillar of pillars) {
    const dist = Math.sqrt(
      Math.pow(position[0] - pillar[0], 2) +
      Math.pow(position[2] - pillar[2], 2)
    );
    const lastDist = Math.sqrt(
      Math.pow(lastPosition[0] - pillar[0], 2) +
      Math.pow(lastPosition[2] - pillar[2], 2)
    );
    minDist = Math.min(minDist, dist);
    lastMinDist = Math.min(lastMinDist, lastDist);
  }

  if (minDist < lastMinDist) {
    reward += 1; // Reward for moving closer to the nearest pillar
    console.log("Reward for moving closer to pillar");
  } else if (minDist > lastMinDist) {
    reward -= 0.5; // Penalty for moving farther away
    console.log("Penalty for moving farther from pillar");
  }

  console.log("Final Reward:", reward);
  return reward;
}



export const characterList = characters;