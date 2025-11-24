import { useGLTF } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef, type JSX } from 'react'
import * as THREE from 'three'
import { InstancedRigidBodies, type InstancedRigidBodyProps } from '@react-three/rapier'

const CONTAINER = { w: 2.438, h: 2.591, d: 6.058 }

const SURFACE_RADIUS = 50
const DEPTH_LEVELS = 3
const Y_OFFSET = 1.296

const RING_HEIGHTS = [5, 3, 2]
const MIN_INNER_RADIUS = 15
const BARRIER_ZIGZAG = 0.25
const INNER_ROTATION_CHAOS = 0.8

const randomRange = (min: number, max: number) => Math.random() * (max - min) + min

type GLTFResult = {
  nodes: { [key: string]: THREE.Mesh }
  materials: { [key: string]: THREE.MeshStandardMaterial }
}

export default function SceneryContainers(props: JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/containers-transformed.glb') as unknown as GLTFResult

  const standardGeo = nodes['container-green'].geometry
  const grayGeo = nodes['container-gray'].geometry

  const types = useMemo(
    () => [
      { id: 'green', geo: standardGeo, mat: materials.create1 },
      { id: 'white', geo: standardGeo, mat: materials.create2 },
      { id: 'red', geo: standardGeo, mat: materials.create3 },
      { id: 'blue', geo: standardGeo, mat: materials.create5 },
      { id: 'gray', geo: grayGeo, mat: materials.create4 },
    ],
    [materials, standardGeo, grayGeo]
  )

  const instancesData = useMemo(() => {
    const temp = new THREE.Object3D()
    const typePool = [0, 1, 2, 3, 4, 4]

    // Structure: Each type has 'ground' (physics) and 'upper' (visual only) lists
    const data = types.map(() => ({
      ground: {
        matrices: [] as THREE.Matrix4[],
        instances: [] as InstancedRigidBodyProps[],
      },
      upper: [] as THREE.Matrix4[],
    }))

    for (let d = 0; d < DEPTH_LEVELS; d++) {
      const isBarrier = d === 0

      const gap = isBarrier ? 0.15 : 3.0
      const radiusNoise = isBarrier ? 0 : randomRange(-2.5, 2.5)
      const currentRadius = SURFACE_RADIUS - d * (CONTAINER.d + 2.0) + radiusNoise

      const circumference = 2 * Math.PI * currentRadius
      const slots = Math.floor(circumference / (CONTAINER.w + gap))
      let skipCounter = 0

      for (let i = 0; i < slots; i++) {
        if (!isBarrier) {
          if (skipCounter > 0) {
            skipCounter--
            continue
          }
          if (Math.random() < 0.15) {
            skipCounter = Math.floor(randomRange(1, 4))
            continue
          }
        }

        const angleStep = (Math.PI * 2) / slots
        const baseAngle = i * angleStep

        let radiusOffset = 0
        if (isBarrier) {
          radiusOffset = (i % 2 === 0 ? 1 : -1) * BARRIER_ZIGZAG
        } else {
          radiusOffset = Math.sin(baseAngle * 4) * 3.0
        }

        const finalRadius = currentRadius + radiusOffset

        if (finalRadius < MIN_INNER_RADIUS + CONTAINER.d / 2) {
          continue
        }

        const x = Math.sin(baseAngle) * finalRadius
        const z = Math.cos(baseAngle) * finalRadius

        let finalAngle = baseAngle
        if (isBarrier) {
          finalAngle += randomRange(-0.05, 0.05)
        } else {
          const isPerpendicular = Math.random() > 0.3
          const orientation = isPerpendicular ? Math.PI / 2 : 0
          const chaos = randomRange(-INNER_ROTATION_CHAOS, INNER_ROTATION_CHAOS)
          finalAngle += orientation + chaos
        }

        const levelMaxHeight = RING_HEIGHTS[d] || 2
        const minHeight = isBarrier ? 3 : 1
        const stackHeight = Math.floor(randomRange(minHeight, levelMaxHeight + 1))

        for (let h = 0; h < stackHeight; h++) {
          const poolIndex = Math.floor(Math.random() * typePool.length)
          const typeIdx = typePool[poolIndex]

          const y = Y_OFFSET + h * CONTAINER.h
          const driftMax = isBarrier ? 0.02 : 0.15

          temp.position.set(x + randomRange(-driftMax, driftMax), y, z + randomRange(-driftMax, driftMax))
          temp.rotation.set(0, finalAngle + randomRange(-0.05, 0.05) + Math.PI, 0)
          
          const scaleJitter = randomRange(0.995, 1.005)
          temp.scale.set(scaleJitter, scaleJitter, scaleJitter)

          temp.updateMatrix()

          // Ground level containers (h=0) get physics
          if (h === 0) {
            data[typeIdx].ground.matrices.push(temp.matrix.clone())
            data[typeIdx].ground.instances.push({
              key: `ground-${d}-${i}`,
              position: [temp.position.x, temp.position.y, temp.position.z],
              // FIX: Use Euler array [x,y,z] instead of Quaternion
              rotation: [temp.rotation.x, temp.rotation.y, temp.rotation.z], 
              scale: [temp.scale.x, temp.scale.y, temp.scale.z],
            })
          } else {
            // Upper containers are visual only
            data[typeIdx].upper.push(temp.matrix.clone())
          }
        }
      }
    }
    return data
  }, [types])

  return (
    <group {...props} dispose={null}>
      {types.map((t, i) => {
        const { ground, upper } = instancesData[i]
        
        return (
          <group key={t.id}>
            {/* 1. Ground Level - With Physics */}
            {ground.matrices.length > 0 && (
              <InstancedRigidBodies
                instances={ground.instances}
                type="fixed"
                colliders="cuboid"
              >
                <RenderInstance geo={t.geo} mat={t.mat} matrices={ground.matrices} />
              </InstancedRigidBodies>
            )}

            {/* 2. Upper Levels - Visual Only */}
            {upper.length > 0 && (
              <RenderInstance geo={t.geo} mat={t.mat} matrices={upper} />
            )}
          </group>
        )
      })}
    </group>
  )
}

function RenderInstance({ geo, mat, matrices }: { geo: any; mat: any; matrices: THREE.Matrix4[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!meshRef.current) return
    matrices.forEach((m, i) => meshRef.current!.setMatrixAt(i, m))
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [matrices])
  return <instancedMesh ref={meshRef} args={[geo, mat, matrices.length]} />
}

useGLTF.preload('/containers-transformed.glb')