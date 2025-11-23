import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'

export default function StochasticFloor() {
  const gl = useThree(state => state.gl)
  const meshRef = useRef<THREE.Mesh>(null)

  const props = useTexture({
    map: '/textures/diff_1k.jpg',
    normalMap: '/textures/nor_gl_1k.jpg',
    roughnessMap: '/textures/rough_1k.jpg',
  })

  const worldSize = 100
  const tileRepeats = 20

  useLayoutEffect(() => {
    const textures = [props.map, props.normalMap, props.roughnessMap]

    textures.forEach(tex => {
      if (!tex) return
      tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping
      tex.repeat.set(tileRepeats, tileRepeats)
      tex.anisotropy = gl.capabilities.getMaxAnisotropy()
    })

    if (meshRef.current) {
      meshRef.current.updateMatrix()
    }
  }, [props, gl, tileRepeats])

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(worldSize, worldSize, 24, 24)
    const count = geo.attributes.position.count
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const variation = 0.08
      const brightness = 1.0 - variation + Math.random() * variation

      colors[i * 3] = brightness
      colors[i * 3 + 1] = brightness
      colors[i * 3 + 2] = brightness
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [worldSize])

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      matrixAutoUpdate={false}
      frustumCulled={false}
    >
      <meshStandardMaterial
        map={props.map}
        normalMap={props.normalMap}
        roughnessMap={props.roughnessMap}
        roughness={0.4}
        metalness={0.2}
        color="#888888"
        normalScale={new THREE.Vector2(1.5, 1.5)}
        vertexColors={true}
        dithering={true}
      />
    </mesh>
  )
}
