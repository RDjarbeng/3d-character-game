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
      speed: 0.5
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
      speed: 0.5
    }
  ];

  interface CharacterProps {
    index: number;
    position: [number, number, number];
    onPillarDestroyed: (position: [number, number, number]) => void;
    isAI?: boolean;
    destroyedPillars: [number, number, number][];
  }

  export function Character({ index, position: initialPosition, onPillarDestroyed, isAI = false , destroyedPillars}: CharacterProps) {
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
      const handleKeyDown = (event: KeyboardEvent) => {
        // console.log("Key down:", event.key); // Debug log
        if (!isAI) { // Only process input if AI is off
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
        }
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        // console.log("Key up:", event.key); // Debug log
        if (!isAI) { // Only process input if AI is off
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
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }, [index, characterSpeed, isAI]);

    
    useFrame(() => {
      if (groupRef.current) {
        
        const pillars = getPillarPositions(destroyedPillars); // Pass destroyed pillars
        if (isAI) {
          console.log('destroyed pillars',destroyedPillars.length, 'pillars', pillars.length);

          // Choose action based on current state
          const action = agent.chooseAction(positionRef.current, pillars);
          // console.log("Chosen action:", action);

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

          // Update references for next frame
          positionRef.current = [
            Math.max(-4, Math.min(4, nextPosition[0])), // X-axis bounds
            nextPosition[1], // Y-axis remains unchanged
            Math.max(-4, Math.min(4, nextPosition[2])), // Z-axis bounds
          ];
          // Calculate reward
          const reward = calculateReward(
            nextPosition,
            lastPositionRef.current,
            pillars,
            characterRadius // Pass characterRadius here
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
          groupRef.current.position.set(...positionRef.current);
        } else {
          // Manual movement logic when AI is off
          const nextPosition = [
            positionRef.current[0] + velocityRef.current[0],
            positionRef.current[1],
            positionRef.current[2] + velocityRef.current[2],
          ] as [number, number, number];


          // console.log("Manual movement - Velocity:", velocityRef.current);

          // Update references for manual movement
          positionRef.current = [
            Math.max(-4, Math.min(4, nextPosition[0])), // X-axis bounds
            nextPosition[1], // Y-axis remains unchanged
            Math.max(-4, Math.min(4, nextPosition[2])), // Z-axis bounds
          ];
          groupRef.current.position.set(...positionRef.current);


        }
        const nextPosition = [
          positionRef.current[0] + velocityRef.current[0],
          positionRef.current[1],
          positionRef.current[2] + velocityRef.current[2]
        ] as [number, number, number];

      
        

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
        for (const pillar of pillars) {
          const dx = nextPosition[0] - pillar[0];
          const dz = nextPosition[2] - pillar[2];
          const distance = Math.sqrt(dx * dx + dz * dz);
        
          console.log(`Checking collision with pillar at ${pillar}: distance=${distance}`);
        
          if (distance < (characterRadius + 0.3)) {
            console.log("Collision detected with pillar:", pillar);
        
            // Add high reward for colliding with a pillar
            const reward = 50; // Large reward for destroying a pillar
            console.log("High reward for colliding with pillar:", reward);
        
            // Learn from this action
            agent.learn(
              lastPositionRef.current,
              lastActionRef.current,
              reward,
              nextPosition,
              pillars
            );
        
            // Mark pillar as destroyed
            onPillarDestroyed(pillar);
            break; // Avoid multiple detections for the same frame
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

  function getPillarPositions(destroyedPillars: [number, number, number][]): [number, number, number][] {
    const positions: [number, number, number][] = [];
    const radius = 4;
  
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const position: [number, number, number] = [x, 0.75, z];
  
      // Exclude destroyed pillars
      const isDestroyed = destroyedPillars.some(p =>
        Math.abs(p[0] - position[0]) < 0.1 &&
        Math.abs(p[2] - position[2]) < 0.1
      );
  
      // console.log(`Checking pillar at ${position}: destroyed=${isDestroyed}`);
  
      if (!isDestroyed) {
        positions.push(position);
      }
    }
  
    // console.log("Remaining Pillars:", positions);
    
  return positions;
  }
  

  function calculateReward(
    position: [number, number, number],
    lastPosition: [number, number, number],
    pillars: [number, number, number][],
    characterRadius: number // Add characterRadius as a parameter
  ): number {
    let reward = -0.05; // Small penalty for each step
  
    // Penalize staying in the same place
    if (
      Math.abs(position[0] - lastPosition[0]) < 0.01 &&
      Math.abs(position[2] - lastPosition[2]) < 0.01
    ) {
      reward -= 2; // Larger penalty for no movement
      console.log("Penalty for no movement");
      return reward; // Exit early since no movement happened
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
      reward += Math.max(10 / minDist, 1); // Reward increases as distance decreases
      console.log("Reward for moving closer to pillar");
    } else if (minDist > lastMinDist) {
      reward -= Math.max(10 / minDist, 1); // Penalty increases as distance increases
      console.log("Penalty for moving farther from pillar");
    }
  
    console.log("Final Reward:", reward);
  
    return reward;
  }
  


  export const characterList = characters;