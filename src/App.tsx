import { Canvas } from '@react-three/fiber'
import {
  Environment,
  Stats,
  KeyboardControls,
  GizmoHelper,
  GizmoViewport,
  ContactShadows,
  Lightformer,
} from '@react-three/drei'
import { CuboidCollider, Physics } from '@react-three/rapier'
import Containers from './components/Containers'
import Car from './components/car/Car'
import StochasticFloor from './components/Surface'
import RainSystem from './components/RainSystem'
import FollowCameraControls from './components/FollowCameraControls'
import DirectionalLightFollower from './components/DirectionalLightFollower'

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
        <color attach="background" args={['#220000']} />
        <Environment preset='sunset' resolution={256}>
          {/* Ceiling */}
          <Lightformer color={'gray'} rotation-x={Math.PI / 2} position={[0, 4, 6]} scale={[10, 1, 1]} />
          <Lightformer color={'gray'} rotation-x={Math.PI / 2} position={[0, 4, 9]} scale={[10, 1, 1]} />
          {/* Sides */}
          <Lightformer color={'red'} intensity={.8} rotation-y={Math.PI / 2} position={[-50, 2, 0]} scale={[100, 2, 1]} />
          <Lightformer color={'red'} intensity={.8} rotation-y={-Math.PI / 2} position={[50, 2, 0]} scale={[100, 2, 1]} />
          {/* Key */}
          <Lightformer
            form="ring"
            color="red"
            intensity={1}
            scale={30}
            position={[5, 5, 5]}
            onUpdate={self => self.lookAt(0, 0, 0)}
          />
        </Environment>
        <DirectionalLightFollower
          offset={[-16, 18, 16]}
          targetOffset={[0, -0.5, 0]}
          followLerp={0.2}
          intensity={5}
          castShadow
          color="red"
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-bias={-0.0005}
          shadow-normalBias={0.02}
        />
        <hemisphereLight intensity={0.8} color={'white'} groundColor={'white'} />

        <directionalLight position={[0, 10, 0]} intensity={1.5} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport />
        </GizmoHelper>
        {/* Wrap everything in Physics. 
            debug={true} will show you the collision boxes (remove it later) */}
        <Physics gravity={[0, -9.81, 0]}>
          <Containers position={[0, 0, 0]} />

          {/* Floor needs to be a collider, usually Surface handles this if it has a RigidBody, 
              but for now let's assume Surface is just visual or handle it there. 
              If StochasticFloor doesn't have a RigidBody, the car will fall through! 
              Let's ensure we have a ground plane if Surface doesn't provide one. */}
          <StochasticFloor />

          <CuboidCollider args={[25, 0.05, 25]} position={[0, -0.05, 0]} />
          <Car position={[0, 1, 0]} />
        </Physics>

        <RainSystem count={5000} height={25} area={50} />
        <Stats />
        <FollowCameraControls />
      </Canvas>
    </KeyboardControls>
  )
}

export default App
