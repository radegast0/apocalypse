import * as THREE from 'three'
import { type JSX } from 'react'
import { useGLTF } from '@react-three/drei'
import Wheels from './Wheels'

type GLTFResult = {
  nodes: {
    Object_2: THREE.Mesh
  }
  materials: {
    ['Scene_-_Root']: THREE.MeshStandardMaterial
  }
}

export default function Car(props: JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/car-transformed.glb') as unknown as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_2.geometry}
        material={materials['Scene_-_Root']}
        position={[0, 0.22, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={0.03}
      />
      <Wheels />
    </group>
  )
}

useGLTF.preload('/car-transformed.glb')
