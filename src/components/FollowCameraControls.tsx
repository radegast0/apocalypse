import { OrbitControls, useKeyboardControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useCarRigStore } from '../hooks/useCarRigStore'

const MIN_CAMERA_HEIGHT = 0.5
const MIN_TARGET_HEIGHT = 0.3
const DETACH_THRESHOLD = 0.15
const FOLLOW_SPEED = 5

export default function FollowCameraControls() {
  const carBody = useCarRigStore(state => state.carBody)
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const detachedRef = useRef(false)
  const userInteractingRef = useRef(false)
  const interactionStartTarget = useRef(new Vector3())
  const smoothedTarget = useRef(new Vector3(0, 0.5, 0))
  const previousTarget = useRef(new Vector3(0, 0.5, 0))
  const carPosition = useMemo(() => new Vector3(), [])
  const deltaTarget = useMemo(() => new Vector3(), [])
  const { camera } = useThree()
  const [, getKeys] = useKeyboardControls()
  const driveInputActiveRef = useRef(false)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    const handleStart = () => {
      userInteractingRef.current = true
      interactionStartTarget.current.copy(controls.target)
    }

    const handleChange = () => {
      if (!userInteractingRef.current || driveInputActiveRef.current) return
      const moved = interactionStartTarget.current.distanceTo(controls.target)
      if (moved > DETACH_THRESHOLD) {
        detachedRef.current = true
      }
    }

    const handleEnd = () => {
      userInteractingRef.current = false
    }

    controls.addEventListener('start', handleStart)
    controls.addEventListener('change', handleChange)
    controls.addEventListener('end', handleEnd)

    return () => {
      controls.removeEventListener('start', handleStart)
      controls.removeEventListener('change', handleChange)
      controls.removeEventListener('end', handleEnd)
    }
  }, [])

  useEffect(() => {
    if (!carBody || !controlsRef.current) return
    const controls = controlsRef.current
    const { x, y, z } = carBody.translation()
    smoothedTarget.current.set(x, Math.max(y, MIN_TARGET_HEIGHT), z)
    deltaTarget.copy(smoothedTarget.current).sub(controls.target)
    controls.target.copy(smoothedTarget.current)
    previousTarget.current.copy(smoothedTarget.current)
    camera.position.add(deltaTarget)
    clampCamera(camera.position)
  }, [carBody, camera])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    const target = controls.target
    previousTarget.current.copy(target)

    const body = carBody

    if (body) {
      const translation = body.translation()
      carPosition.set(translation.x, Math.max(translation.y, MIN_TARGET_HEIGHT), translation.z)
    }

    const { forward, backward } = getKeys()
    const driveInputActive = Boolean(forward || backward)
    driveInputActiveRef.current = driveInputActive

    if (driveInputActive && detachedRef.current) {
      detachedRef.current = false
      smoothedTarget.current.copy(target)
    }

    if (body && !detachedRef.current) {
      const followFactor = 1 - Math.exp(-FOLLOW_SPEED * delta)
      smoothedTarget.current.lerp(carPosition, followFactor)
      clampTarget(smoothedTarget.current)
      deltaTarget.copy(smoothedTarget.current).sub(previousTarget.current)
      camera.position.add(deltaTarget)
      clampCamera(camera.position)
      target.copy(smoothedTarget.current)
    } else {
      clampCamera(camera.position)
      clampTarget(target)
      smoothedTarget.current.copy(target)
    }

    previousTarget.current.copy(target)
    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.12}
      maxPolarAngle={Math.PI / 2.05}
      minPolarAngle={Math.PI / 5}
      minDistance={1.5}
      maxDistance={25}
      makeDefault
      target={[0, 0.5, 0]}
    />
  )
}

function clampTarget(target: Vector3) {
  target.y = Math.max(target.y, MIN_TARGET_HEIGHT)
}

function clampCamera(position: Vector3) {
  position.y = Math.max(position.y, MIN_CAMERA_HEIGHT)
}
