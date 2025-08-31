import { Canvas } from "@react-three/fiber";
import { useRef } from "react";
import { CameraControls, Environment } from "@react-three/drei";
import Character from "./components/Character";
import Warehouse from "./components/Warehouse";
import OcclusionFader from "./components/OcclusionFader";
import * as THREE from "three";
import { Char } from "./components/Char";

function App() {
  const characterRef = useRef<THREE.Group>(null);
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Canvas shadows camera={{ position: [2, 3, 5] }}>
        <Environment environmentIntensity={1} preset="city" />

        <directionalLight
          position={[5, 10, 7.5]}
          intensity={1.5}
          castShadow
          // shadow-mapSize={[1024 * 16, 1024 * 16]}
        />

        <Char />

        <Warehouse />
        <Character ref={characterRef} position={[0, 0, 0]} />
        <OcclusionFader target={characterRef} />

        {/* <ambientLight intensity={0.5} /> */}
        <CameraControls />
        <color attach="background" args={["#202020"]} />
      </Canvas>
    </div>
  );
}

export default App;
