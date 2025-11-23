import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { JSX } from 'react'

type GLTFResult = {
  nodes: {
    ['back-right']: THREE.Mesh
    ['front-left']: THREE.Mesh
    ['front-right']: THREE.Mesh
    ['back-left']: THREE.Mesh
  }
  materials: {
    ['Scene_-_Root.002']: THREE.MeshStandardMaterial
  }
}

export default function Wheels(props: JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/wheels.glb') as unknown as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes['back-right'].geometry}
        material={materials['Scene_-_Root.002']}
        position={[0.252, 0.106, 0.417]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes['front-left'].geometry}
        material={materials['Scene_-_Root.002']}
        position={[-0.252, 0.106, -0.5]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes['front-right'].geometry}
        material={materials['Scene_-_Root.002']}
        position={[0.252, 0.106, -0.5]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes['back-left'].geometry}
        material={materials['Scene_-_Root.002']}
        position={[-0.252, 0.106, 0.417]}
      />
    </group>
  )
}

useGLTF.preload('/wheels.glb')
