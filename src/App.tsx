import { useEffect, useRef } from 'react'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { Environment, Stats, KeyboardControls, GizmoHelper, GizmoViewport, Lightformer } from '@react-three/drei'
import { CuboidCollider, Physics } from '@react-three/rapier'
import Containers from './components/Containers'
import Car from './components/car/Car'
import StochasticFloor from './components/Surface'
import RainSystem from './components/RainSystem'
import FollowCameraControls from './components/FollowCameraControls'
import DirectionalLightFollower from './components/DirectionalLightFollower'
import { DataTexture, EquirectangularReflectionMapping } from 'three'
import { EXRLoader, RGBELoader } from 'three-stdlib'

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'brake', keys: ['Space'] },
  { name: 'boost', keys: ['Shift'] },
]

type HdriBackgroundProps = {
  url: string
  tint?: {
    r?: number
    g?: number
    b?: number
  }
}

function HdriBackground({ url, tint }: HdriBackgroundProps) {
  const { scene } = useThree()
  const lowerUrl = url.toLowerCase()
  const Loader = lowerUrl.endsWith('.hdr') ? RGBELoader : EXRLoader
  const texture = useLoader(Loader as any, url) as DataTexture
  const tintedRef = useRef(false)

  useEffect(() => {
    if (!tintedRef.current && texture.image?.data && tint) {
      const data = texture.image.data as Float32Array | number[]
      const rFactor = tint.r ?? 1
      const gFactor = tint.g ?? 1
      const bFactor = tint.b ?? 1
      for (let i = 0; i < data.length; i += 4) {
        data[i] *= rFactor
        data[i + 1] *= gFactor
        data[i + 2] *= bFactor
      }
      texture.needsUpdate = true
      tintedRef.current = true
    }

    const previousBackground = scene.background
    texture.mapping = EquirectangularReflectionMapping
    scene.background = texture
    return () => {
      scene.background = previousBackground
    }
  }, [scene, texture])

  return null
}

function App() {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas shadows camera={{ position: [5, 5, 5], fov: 60 }}>
        <color attach="background" args={['#300000']} />
        <HdriBackground url="/hdri.exr" tint={{ r: 1.2, g: 0.88, b: 0.88 }} />
        <Environment environmentIntensity={1} resolution={512}>
          {/* Ceiling */}
          <Lightformer color={'red'} rotation-x={Math.PI / 2} position={[0, 4, 6]} scale={[10, 1, 10]} />
          <Lightformer color={'red'} rotation-x={Math.PI / 2} position={[0, 4, 9]} scale={[10, 1, 10]} />
          <Lightformer color={'red'} rotation-x={Math.PI / 2} position={[0, 4, 0]} scale={[10, 1, 10]} />
          <Lightformer color={'red'} rotation-x={Math.PI / 2} position={[0, 4, -6]} scale={[10, 1, 10]} />
          {/* Sides */}

          <Lightformer color={'red'} intensity={0.5} rotation-y={-Math.PI / 2} position={[0, 20, 0]} scale={50} />
          {/* Key */}
          <Lightformer
            form="ring"
            color="red"
            intensity={0.4}
            scale={200}
            position={[0, 5, 0]}
            onUpdate={self => self.lookAt(0, 0, 0)}
          />
        </Environment>
        <DirectionalLightFollower
          offset={[6, 6, 6]}
          targetOffset={[0, -0.5, 0]}
          followLerp={0.2}
          intensity={2}
          castShadow
          color="white"
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
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

          <CuboidCollider args={[50, 0.05, 50]} position={[0, -0.05, 0]} />
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
