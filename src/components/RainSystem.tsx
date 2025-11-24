import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const floorLogic = `
  float getFloorHeight(vec3 pos) {
    return 0.0; 
  }
`

const rainVertexShader = `
  uniform float uTime;
  uniform float uHeight;
  uniform float uSpeed;
  uniform vec2 uSize; 
  ${floorLogic}
  
  attribute float aSpeed;
  attribute vec3 aPos;

  varying float vAlpha;

  void main() {
    vec3 scaledPos = position;
    scaledPos.x *= uSize.x;
    scaledPos.z *= uSize.x;
    scaledPos.y *= uSize.y;

    float floorY = getFloorHeight(aPos);

    float fallSpeed = aSpeed * uSpeed;
    float fallDist = uTime * fallSpeed;
    float relativeY = mod(aPos.y - fallDist, uHeight);
    float currentY = relativeY;

    vec3 worldPos = vec3(aPos.x + scaledPos.x, currentY + scaledPos.y, aPos.z + scaledPos.z);

    float fadeFloor = smoothstep(0.0, 0.5, relativeY); 
    float fadeCeil = 1.0 - smoothstep(uHeight - 2.0, uHeight, relativeY);
    
    vAlpha = fadeFloor * fadeCeil;

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(worldPos, 1.0);
  }
`

const rainFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  
  void main() {
    gl_FragColor = vec4(uColor, uOpacity * vAlpha);
  }
`

const splashVertexShader = `
  uniform float uTime;
  uniform float uHeight;
  uniform float uSpeed;
  uniform float uSplashScale;
  uniform float uSplashDuration;
  ${floorLogic}

  attribute float aSpeed;
  attribute vec3 aPos;

  varying float vAlpha;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    float floorY = getFloorHeight(aPos);

    float fallSpeed = aSpeed * uSpeed;
    float fallDist = uTime * fallSpeed;
    
    float loop = mod(aPos.y - fallDist, uHeight);

    float progress = 1.0 - smoothstep(0.0, uSplashDuration, loop);

    float scale = progress * uSplashScale;

    vec3 worldPos = vec3(
      aPos.x + transformed.x * scale, 
      floorY + 0.02, 
      aPos.z + transformed.z * scale
    );

    vAlpha = smoothstep(0.0, 0.2, scale) * (1.0 - smoothstep(0.5, 1.0, scale));

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(worldPos, 1.0);
  }
`

const splashFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vAlpha;
  varying vec2 vUv;
  
  void main() {
    float dist = distance(vUv, vec2(0.5));
    float ring = smoothstep(0.35, 0.4, dist) * (1.0 - smoothstep(0.4, 0.45, dist));
    if (dist > 0.5 || vAlpha < 0.01) discard;
    gl_FragColor = vec4(uColor, ring * vAlpha * uOpacity); 
  }
`


export type RainSystemProps = {
  count?: number
  height?: number
  area?: number
}

export default function RainSystem({ count, height, area }: RainSystemProps = {}) {
  const streakMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const splashMaterialRef = useRef<THREE.ShaderMaterial>(null)

  const finalCount = count ?? 10000
  const finalHeight = height ?? 30
  const finalArea = area ?? 70
  const color = '#dbeafe'
  const opacity = 0.35
  const speed = 1.0
  const streakWidth = 0.002
  const streakLength = 0.4
  const splashSize = 0.1
  const splashDuration = 3.0

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: finalHeight },
      uSpeed: { value: speed },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uSize: { value: new THREE.Vector2(streakWidth, streakLength) },
      uSplashScale: { value: splashSize },
      uSplashDuration: { value: splashDuration },
    }),
    [finalHeight, speed, color, opacity, streakWidth, streakLength, splashSize, splashDuration]
  )

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(finalCount * 3)
    const speeds = new Float32Array(finalCount)
    for (let i = 0; i < finalCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * finalArea
      positions[i * 3 + 1] = Math.random() * finalHeight
      positions[i * 3 + 2] = (Math.random() - 0.5) * finalArea
      speeds[i] = 7 + Math.random() * 10
    }
    return { positions, speeds }
  }, [finalCount, finalHeight, finalArea])

  const streakGeo = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry()
    const base = new THREE.BoxGeometry(1, 1, 1)
    geo.index = base.index
    geo.attributes.position = base.attributes.position
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(positions, 3))
    geo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds, 1))
    return geo
  }, [positions, speeds])

  const splashGeo = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry()
    const base = new THREE.PlaneGeometry(1, 1)
    base.rotateX(-Math.PI / 2)
    geo.index = base.index
    geo.attributes.position = base.attributes.position
    geo.attributes.uv = base.attributes.uv
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(positions, 3))
    geo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds, 1))
    return geo
  }, [positions, speeds])

  useEffect(() => {
    const updateMaterialUniforms = (material: THREE.ShaderMaterial | null) => {
      if (!material) return
      const { uniforms: matUniforms } = material
      matUniforms.uHeight.value = finalHeight
      matUniforms.uSpeed.value = speed
      matUniforms.uColor.value.set(color)
      matUniforms.uOpacity.value = opacity
      matUniforms.uSize?.value.set(streakWidth, streakLength)
      if (matUniforms.uSplashScale) matUniforms.uSplashScale.value = splashSize
      if (matUniforms.uSplashDuration) matUniforms.uSplashDuration.value = splashDuration
    }

    updateMaterialUniforms(streakMaterialRef.current)
    updateMaterialUniforms(splashMaterialRef.current)
  }, [color, finalHeight, opacity, speed, splashDuration, splashSize, streakLength, streakWidth])

  useFrame((_, delta) => {
    const advanceTime = (material: THREE.ShaderMaterial | null) => {
      if (!material) return
      material.uniforms.uTime.value += delta
    }

    advanceTime(streakMaterialRef.current)
    advanceTime(splashMaterialRef.current)
  })

  return (
    <>
      <mesh geometry={streakGeo} frustumCulled={false}>
        <shaderMaterial
          ref={streakMaterialRef}
          vertexShader={rainVertexShader}
          fragmentShader={rainFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh geometry={splashGeo} frustumCulled={false}>
        <shaderMaterial
          ref={splashMaterialRef}
          vertexShader={splashVertexShader}
          fragmentShader={splashFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  )
}