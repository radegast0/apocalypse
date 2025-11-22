import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import Containers from './components/Containers'
import Surface from './components/Surface'

function App() {
  return (
    <Canvas shadows camera={{ position: [2, 3, 5], fov: 60 }}>
      <Environment preset="dawn" environmentIntensity={0.5} />
      <Containers position={[0, 0, 0]} />
      <Surface position={[0, 0, 0]} />

      <OrbitControls />
      <color attach="background" args={['#202020']} />
    </Canvas>
  )
}

export default App
