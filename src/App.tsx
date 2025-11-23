import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, Stats } from '@react-three/drei'
import Containers from './components/Containers'
import Car from './components/car/Car'
import StochasticFloor from './components/Surface'
import RainSystem from './components/RainSystem'

function App() {
  return (
    <Canvas shadows camera={{ position: [2, 3, 5], fov: 60 }}>
      <Environment preset="dawn" environmentIntensity={0.5} />

      <directionalLight position={[5, 5, 5]} intensity={5} castShadow />

      <Containers position={[0, 0, 0]} />
      <StochasticFloor />

      <RainSystem count={4000} height={25} area={50} />

      <Car position={[0, 0, 0]} />

      <Stats />

      <OrbitControls />
      <color attach="background" args={['#202020']} />
    </Canvas>
  )
}

export default App
