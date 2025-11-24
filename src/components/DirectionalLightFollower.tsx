import { useMemo, useRef, type JSX } from 'react'
import { useFrame } from '@react-three/fiber'
import { DirectionalLight, MathUtils, Vector3 } from 'three'
import { useCarRigStore } from '../hooks/useCarRigStore'

type Tuple3 = [number, number, number]

type DirectionalLightFollowerProps = JSX.IntrinsicElements['directionalLight'] & {
  offset?: Tuple3
  targetOffset?: Tuple3
  followLerp?: number
}

const clampLerp = (value: number) => MathUtils.clamp(value, 0.01, 1)

export default function DirectionalLightFollower({
  offset = [-6, 8, 6],
  targetOffset = [0, 0, 0],
  followLerp = 0.15,
  ...rest
}: DirectionalLightFollowerProps) {
  const lightRef = useRef<DirectionalLight>(null)
  const carBody = useCarRigStore(state => state.carBody)
  const lerpFactor = useMemo(() => clampLerp(followLerp), [followLerp])

  const offsetVec = useMemo(() => new Vector3(...offset), [offset])
  const targetOffsetVec = useMemo(() => new Vector3(...targetOffset), [targetOffset])

  const desiredPos = useMemo(() => new Vector3(), [])
  const desiredTarget = useMemo(() => new Vector3(), [])
  const carPos = useMemo(() => new Vector3(), [])

  useFrame(() => {
    const light = lightRef.current
    if (!light) return

    if (!carBody) {
      desiredPos.copy(offsetVec)
      desiredTarget.copy(targetOffsetVec)
    } else {
      const translation = carBody.translation()
      carPos.set(translation.x, translation.y, translation.z)

      desiredPos.copy(carPos).add(offsetVec)
      desiredTarget.copy(carPos).add(targetOffsetVec)
    }

    light.position.lerp(desiredPos, lerpFactor)
    light.target.position.lerp(desiredTarget, lerpFactor)
    light.target.updateMatrixWorld()
  })

  return <directionalLight ref={lightRef} {...rest} />
}
