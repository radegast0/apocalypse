import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { JSX } from 'react'

type GLTFResult = {
  nodes: {
    ['back-left']: THREE.Mesh
    ['back-left001']: THREE.Mesh
    ['front-left']: THREE.Mesh
    ['front-right']: THREE.Mesh
  }
  materials: {
    ['Scene_-_Root']: THREE.MeshStandardMaterial
  }
}

export default function Wheels(props: JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/wheels.glb') as unknown as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes['back-left'].geometry}
        material={materials['Scene_-_Root']}
        position={[0.235, 0.105, -0.381]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes['back-left001'].geometry}
        material={materials['Scene_-_Root']}
        position={[-0.244, 0.106, -0.38]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes['front-left'].geometry}
        material={materials['Scene_-_Root']}
        position={[0.25, 0.106, 0.531]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes['front-right'].geometry}
        material={materials['Scene_-_Root']}
        position={[-0.253, 0.107, 0.544]}
      />
    </group>
  )
}

useGLTF.preload('/wheels.glb')
