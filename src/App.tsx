import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, Stats, KeyboardControls } from '@react-three/drei'
import { CuboidCollider, Physics } from '@react-three/rapier'
import Containers from './components/Containers'
import Car from './components/car/Car'
import StochasticFloor from './components/Surface'
import RainSystem from './components/RainSystem'

// Define our control keys
const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'brake', keys: ['Space'] },
]

function App() {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas shadows camera={{ position: [5, 5, 5], fov: 60 }}>
        <Environment preset="dawn" environmentIntensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={5} castShadow />

        {/* Wrap everything in Physics. 
            debug={true} will show you the collision boxes (remove it later) */}
        <Physics debug gravity={[0, -9.81, 0]}>
          <Containers position={[0, 0, 0]} />
          
          {/* Floor needs to be a collider, usually Surface handles this if it has a RigidBody, 
              but for now let's assume Surface is just visual or handle it there. 
              If StochasticFloor doesn't have a RigidBody, the car will fall through! 
              Let's ensure we have a ground plane if Surface doesn't provide one. */}
          <StochasticFloor /> 
          
          <CuboidCollider args={[25, 0.05, 25]} position={[0, -0.05, 0]} />
          <Car position={[0, 1, 0]} />
        </Physics>

        <RainSystem count={4000} height={25} area={50} />
        <Stats />
        <OrbitControls />
        <color attach="background" args={['#202020']} />
      </Canvas>
    </KeyboardControls>
  )
}

export default App