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
    if (groupRef.current) {
      if (isAI) {
        // Get remaining pillars
        const pillars = getPillarPositions();
        
        // Choose action based on current state
        const action = agent.chooseAction(positionRef.current, pillars);
        
        // Apply action
        velocityRef.current = [0, 0, 0];
        switch (action) {
          case 'up':
            velocityRef.current[2] = -characterSpeed;
            break;
          case 'down':
            velocityRef.current[2] = characterSpeed;
            break;
          case 'left':
            velocityRef.current[0] = -characterSpeed;
            break;
          case 'right':
            velocityRef.current[0] = characterSpeed;
            break;
        }

        // Calculate reward based on pillar destruction and movement
        const reward = calculateReward(positionRef.current, pillars);
        
        // Learn from the previous action
        agent.learn(
          lastPositionRef.current,
          lastActionRef.current,
          reward,
          positionRef.current,
          pillars
        );

        // Update references for next frame
        lastPositionRef.current = [...positionRef.current];
        lastActionRef.current = action;
      }

      const nextPosition = [
        positionRef.current[0] + velocityRef.current[0],
        positionRef.current[1],
        positionRef.current[2] + velocityRef.current[2]
      ] as [number, number, number];

      // Check collisions with pillars
      const pillars = getPillarPositions();
      for (const pillar of pillars) {
        const dx = nextPosition[0] - pillar[0];
        const dz = nextPosition[2] - pillar[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < (characterRadius + 0.3)) {
          onPillarDestroyed(pillar);
        }
      }

      // Update position with bounds checking
      positionRef.current = [
        Math.max(-4, Math.min(4, nextPosition[0])),
        nextPosition[1],
        Math.max(-4, Math.min(4, nextPosition[2]))
      ];

      groupRef.current.position.set(...positionRef.current);

      if (index === 1) {
        const rollSpeed = 2;
        if (velocityRef.current[2] !== 0) {
          groupRef.current.rotation.x -= velocityRef.current[2] * rollSpeed;
        }
        if (velocityRef.current[0] !== 0) {
          groupRef.current.rotation.z -= velocityRef.current[0] * rollSpeed;
        }
      } else {
        const currentRotation = groupRef.current.rotation.y;
        const targetRotation = rotationRef.current;
        const rotationDiff = targetRotation - currentRotation;
        
        if (Math.abs(rotationDiff) > 0.01) {
          groupRef.current.rotation.y += rotationDiff * 0.1;
        }
      }
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

function calculateReward(position: [number, number, number], pillars: [number, number, number][]): number {
  let reward = -0.1; // Small negative reward for each step to encourage efficiency

  // Find distance to nearest pillar
  let minDist = Infinity;
  for (const pillar of pillars) {
    const dist = Math.sqrt(
      Math.pow(position[0] - pillar[0], 2) + 
      Math.pow(position[2] - pillar[2], 2)
    );
    minDist = Math.min(minDist, dist);
  }

  // Reward for being close to pillars
  if (minDist < 1) {
    reward += (1 - minDist) * 0.5;
  }

  // Penalty for being at the bounds
  if (Math.abs(position[0]) > 3.5 || Math.abs(position[2]) > 3.5) {
    reward -= 0.2;
  }

  return reward;
}

export const characterList = characters;