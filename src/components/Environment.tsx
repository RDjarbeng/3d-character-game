import { useRef, useState, useEffect } from 'react';
import { Box } from '@react-three/drei';
import { Environment as DreiEnvironment } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ExplosionParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  mesh: THREE.Mesh;
}

function Explosion({ position, onComplete }: { position: [number, number, number], onComplete: () => void }) {
  const particles = useRef<ExplosionParticle[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const [completed, setCompleted] = useState(false);

  useFrame((state, delta) => {
    if (completed) return;

    if (particles.current.length === 0 && groupRef.current) {
      // Initialize explosion
      for (let i = 0; i < 20; i++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.1, 0.1),
          new THREE.MeshStandardMaterial({ color: '#ef4444' })
        );
        
        const angle = Math.random() * Math.PI * 2;
        const force = 0.1 + Math.random() * 0.2;
        const particle: ExplosionParticle = {
          position: new THREE.Vector3(...position),
          velocity: new THREE.Vector3(
            Math.cos(angle) * force,
            0.2 + Math.random() * 0.3,
            Math.sin(angle) * force
          ),
          scale: 1.0,
          mesh
        };
        
        groupRef.current.add(mesh);
        particles.current.push(particle);
      }
    }

    // Update particles
    let allComplete = true;
    particles.current.forEach((particle) => {
      particle.velocity.y -= delta * 2; // gravity
      particle.position.add(particle.velocity);
      particle.scale -= delta;
      
      if (particle.scale > 0) {
        allComplete = false;
        particle.mesh.position.copy(particle.position);
        particle.mesh.scale.setScalar(particle.scale);
      } else {
        particle.mesh.visible = false;
      }
    });

    if (allComplete) {
      setCompleted(true);
      onComplete();
    }
  });

  return <group ref={groupRef} />;
}

interface EnvironmentProps {
  destroyedPillars: [number, number, number][];
  onPillarDestroyed: (position: [number, number, number]) => void;
  triggerExplosion?: boolean;
}

export function Environment({ destroyedPillars, onPillarDestroyed }: EnvironmentProps) {
  const [explosions, setExplosions] = useState<{ id: number; position: [number, number, number] }[]>([]);
  const nextExplosionId = useRef(0);

  // Watch for new destroyed pillars and create explosions
  useEffect(() => {
    const lastDestroyedPillar = destroyedPillars[destroyedPillars.length - 1];
    if (lastDestroyedPillar) {
      setExplosions(prev => [...prev, { 
        id: nextExplosionId.current++, 
        position: lastDestroyedPillar 
      }]);
    }
  }, [destroyedPillars]);

  const removeExplosion = (id: number) => {
    setExplosions(prev => prev.filter(exp => exp.id !== id));
  };

  return (
    <>
      <DreiEnvironment preset="sunset" />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      
      {/* Platform */}
      <Box 
        args={[10, 0.5, 10]} 
        position={[0, -0.25, 0]} 
        receiveShadow
      >
        <meshStandardMaterial color="#2d3748" />
      </Box>

      {/* Pillars */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 4;
        const position: [number, number, number] = [
          Math.cos(angle) * radius,
          0.75,
          Math.sin(angle) * radius
        ];

        // Check if this pillar is destroyed
        if (destroyedPillars.some(p => 
          Math.abs(p[0] - position[0]) < 0.1 && 
          Math.abs(p[2] - position[2]) < 0.1
        )) {
          return null;
        }

        return (
          <Box
            key={i}
            args={[0.4, 1.5, 0.4]}
            position={position}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#4a5568" />
          </Box>
        );
      })}

      {/* Explosions */}
      {explosions.map(({ id, position }) => (
        <Explosion
          key={id}
          position={position}
          onComplete={() => removeExplosion(id)}
        />
      ))}

      {/* Center marker */}
      <Box
        args={[0.5, 0.1, 0.5]}
        position={[0, 0.01, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#e53e3e" />
      </Box>
    </>
  );
}