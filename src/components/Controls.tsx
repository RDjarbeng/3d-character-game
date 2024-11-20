import { OrbitControls } from '@react-three/drei';

export function Controls() {
  return (
    <OrbitControls
      enablePan={false}
      minDistance={5}
      maxDistance={15}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.5}
    />
  );
}