import * as THREE from 'three'
import { useRef, useEffect, useMemo, type JSX } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useKeyboardControls } from '@react-three/drei'
import { RigidBody, useRapier, RapierRigidBody, CuboidCollider } from '@react-three/rapier'
import { useControls } from 'leva'

const WHEEL_SLOTS = [
  { id: 'front-left', label: 'Front Left', node: 'front-left', steering: false },
  { id: 'front-right', label: 'Front Right', node: 'front-right', steering: false },
  { id: 'rear-left', label: 'Rear Left', node: 'back-left', steering: true },
  { id: 'rear-right', label: 'Rear Right', node: 'back-right', steering: true },
] as const

type WheelSlot = (typeof WHEEL_SLOTS)[number]
type WheelNodeName = WheelSlot['node']
type Axis = 'x' | 'y' | 'z'

type CarGLTFResult = {
  nodes: {
    Object_2: THREE.Mesh
  }
  materials: {
    ['Scene_-_Root']: THREE.MeshStandardMaterial
  }
}

type WheelGLTFResult = {
  nodes: Record<WheelNodeName, THREE.Mesh>
  materials: Record<string, THREE.MeshStandardMaterial>
}

type WheelVisualMeta = {
  correction: [number, number, number]
  thinAxis: Axis
  bbox: THREE.Vector3
}

const AXES: Axis[] = ['x', 'y', 'z']
const AXIS_INDEX: Record<Axis, number> = { x: 0, y: 1, z: 2 }
const WHEEL_OFFSETS: Record<WheelSlot['id'], { x: number; y: number; z: number }> = {
  'front-left': { x: 0.4, y: 0.106, z: 0.252 },
  'front-right': { x: 0.4, y: 0.106, z: -0.252 },
  'rear-left': { x: -0.52, y: 0.106, z: 0.252 },
  'rear-right': { x: -0.52, y: 0.106, z: -0.252 },
}
const CHASSIS_ROTATION: [number, number, number] = [0, 0, 0]
const WHEEL_ALIGNMENT_Y = Math.PI / 2

function analyzeWheelGeometry(geometry: THREE.BufferGeometry): WheelVisualMeta {
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  const bbox = geometry.boundingBox?.clone() ?? new THREE.Box3()
  const bboxSize = new THREE.Vector3()
  bbox.getSize(bboxSize)

  const dims = [bboxSize.x, bboxSize.y, bboxSize.z]
  let minIndex = 0
  for (let i = 1; i < dims.length; i++) {
    if (dims[i] < dims[minIndex]) minIndex = i
  }

  const thinAxis = AXES[minIndex] ?? 'x'
  const correction: [number, number, number] =
    thinAxis === 'y' ? [0, 0, -Math.PI / 2] : thinAxis === 'z' ? [0, Math.PI / 2, 0] : [0, 0, 0]

  return {
    correction,
    thinAxis,
    bbox: bboxSize,
  }
}

function getWheelSlotPosition(slot: WheelSlot, wheelNodes: WheelGLTFResult['nodes']) {
  const fallback = wheelNodes[slot.node]?.position
  return WHEEL_OFFSETS[slot.id] ?? fallback ?? { x: 0, y: 0, z: 0 }
}

type CarProps = JSX.IntrinsicElements['group']

export default function Car(props: CarProps) {
  const { world } = useRapier()
  const chassisRef = useRef<RapierRigidBody>(null)
  const vehicleController = useRef<ReturnType<typeof world.createVehicleController> | null>(null)

  const { nodes: carNodes, materials: carMaterials } = useGLTF('/car-transformed.glb') as unknown as CarGLTFResult
  const { nodes: wheelNodes, materials: wheelMaterials } = useGLTF('/wheels.glb') as unknown as WheelGLTFResult

  const wheelVisualMeta = useMemo(
    () => WHEEL_SLOTS.map(slot => analyzeWheelGeometry(wheelNodes[slot.node].geometry)),
    [wheelNodes]
  )

  const defaultWheelWidth = useMemo(() => {
    const primary = wheelVisualMeta[0]
    if (!primary) return 0.12
    const axisIndex = AXIS_INDEX[primary.thinAxis]
    const sourceWidth = primary.bbox.getComponent(axisIndex)
    return Number.isFinite(sourceWidth) ? sourceWidth : 0.12
  }, [wheelVisualMeta])

  const [, getKeys] = useKeyboardControls()

  const wheelsRef = [
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
  ]

  // Debug lines
  const debugWheelsRef = [
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
  ]

  // --- LEVA CONTROLS ---
  const {
    engineForce,
    brakeForce,
    maxSteer,
    driveDir,
    // Suspension
    suspensionStiffness,
    suspensionCompression,
    suspensionRelaxation,
    suspensionRestLength,
    maxSuspensionTravel,
    maxSuspensionForce,
    wheelRadius,
    wheelWidth,
    frictionSlip,
    sideFriction,
    // Visual Alignment Fixes
    meshRotateY,
    visualAxis,
    debug,
  } = useControls('Car Config', {
    // Drive
    engineForce: { value: 1, min: 0, max: 500 },
    brakeForce: { value: 0.01, min: 0, max: 50 },
    driveDir: { value: -1, options: { Forward: 1, Backward: -1 }, label: 'Motor Direction' }, // Toggle this if W is backwards
    maxSteer: { value: 0.5, min: 0.1, max: 1 },

    // Suspension
    suspensionStiffness: { value: 50, min: 10, max: 100 },
    suspensionCompression: { value: 4, min: 0.1, max: 20, label: 'Compression Damping' },
    suspensionRelaxation: { value: 2, min: 0.1, max: 20, label: 'Rebound Damping' },
    suspensionRestLength: { value: 0.1, min: 0.05, max: 0.5 },
    maxSuspensionTravel: { value: 0.3, min: 0.05, max: 0.6 },
    maxSuspensionForce: { value: 500, min: 50, max: 5000 },
    wheelRadius: { value: 0.11, min: 0.05, max: 0.3 },
    wheelWidth: { value: defaultWheelWidth, min: 0.03, max: 0.4, step: 0.005 },

    // Traction / Drift
    frictionSlip: { value: 4, min: 0.1, max: 20, label: 'Forward Grip (Slip)' },
    sideFriction: { value: 1.25, min: 0.1, max: 5, label: 'Side Grip' },

    // VISUAL FIXES - Use these to fix the "No Rotation" issue
    meshRotateY: { value: 0, min: -180, max: 180, step: 1, label: 'Mesh Correction Y' },
    visualAxis: { value: 'auto', options: ['auto', 'x', 'y', 'z'], label: 'Spin Axis' }, // 'auto' uses the detected axle axis

    debug: { value: true },
  })

  // Physics Setup
  useEffect(() => {
    if (!chassisRef.current || !world) return

    const vehicle = world.createVehicleController(chassisRef.current)
    const suspensionDirection = { x: 0, y: -1, z: 0 }
    const axleAxis = { x: 0, y: 0, z: 1 }

    WHEEL_SLOTS.forEach(slot => {
      const position = getWheelSlotPosition(slot, wheelNodes)
      vehicle.addWheel(position, suspensionDirection, axleAxis, suspensionRestLength, wheelRadius)
    })

    vehicleController.current = vehicle

    return () => {
      if (vehicleController.current) {
        world.removeVehicleController(vehicleController.current)
        vehicleController.current = null
      }
    }
  }, [world, suspensionRestLength, wheelRadius])

  useEffect(() => {
    if (!debug) return
    console.groupCollapsed('Wheel visual diagnostics (Blender ➜ R3F)')
    WHEEL_SLOTS.forEach((slot, idx) => {
      const meta = wheelVisualMeta[idx]
      if (!meta) return
      console.log(`${slot.label}`, {
        thicknessAxis: meta.thinAxis,
        boundingBoxMeters: meta.bbox.toArray().map(v => Number(v.toFixed(3))),
      })
    })
    console.groupEnd()
  }, [debug, wheelVisualMeta])

  // Loop
  useFrame((_, delta) => {
    if (!vehicleController.current || !chassisRef.current) return

    const { forward, backward, left, right, brake } = getKeys()
    const vehicle = vehicleController.current

    // 1. Update Suspension Live
    for (let i = 0; i < WHEEL_SLOTS.length; i++) {
      vehicle.setWheelSuspensionStiffness(i, suspensionStiffness)
      vehicle.setWheelSuspensionCompression?.(i, suspensionCompression)
      vehicle.setWheelSuspensionRelaxation?.(i, suspensionRelaxation)
      vehicle.setWheelMaxSuspensionForce?.(i, maxSuspensionForce)
      vehicle.setWheelMaxSuspensionTravel?.(i, maxSuspensionTravel)
      vehicle.setWheelSuspensionRestLength?.(i, suspensionRestLength)
      vehicle.setWheelRadius?.(i, wheelRadius)
      vehicle.setWheelFrictionSlip?.(i, frictionSlip)
      vehicle.setWheelSideFrictionStiffness?.(i, sideFriction)
    }

    // 2. Drive (AWD - All Wheels Powered to see rotation)
    const force = (forward ? engineForce : backward ? -engineForce : 0) * driveDir

    for (let i = 0; i < WHEEL_SLOTS.length; i++) {
      vehicle.setWheelEngineForce(i, force)
    }

    // 3. Steer
    const steer = left ? maxSteer : right ? -maxSteer : 0
    WHEEL_SLOTS.forEach((slot, i) => {
      vehicle.setWheelSteering(i, slot.steering ? steer : 0)
    })

    // 4. Brake
    const b = brake ? brakeForce : 0
    for (let i = 0; i < WHEEL_SLOTS.length; i++) vehicle.setWheelBrake(i, b)

    vehicle.updateVehicle(delta)

    // 5. Sync Visuals
    const meshCorrectionRad = THREE.MathUtils.degToRad(meshRotateY)
    wheelsRef.forEach((ref, i) => {
      const wheelGroup = ref.current
      if (!wheelGroup) return

      // Get Physics Data
      const connection = vehicle.wheelChassisConnectionPointCs(i)
      if (!connection) return

      const suspensionLen = vehicle.wheelSuspensionLength
        ? vehicle.wheelSuspensionLength(i) ?? suspensionRestLength
        : suspensionRestLength
      const steering = vehicle.wheelSteering(i) || 0
      const rotation = vehicle.wheelRotation(i) || 0

      // Position + reset rotation
      wheelGroup.position.set(connection.x, connection.y - suspensionLen, connection.z)
      wheelGroup.rotation.set(0, 0, 0)

      // Apply steering + baseline rotation so Blender's forward (Z-) matches Rapier forward (Z-)
      wheelGroup.rotateY(steering)
      wheelGroup.rotateY(WHEEL_ALIGNMENT_Y)
      wheelGroup.rotateY(meshCorrectionRad)

      // Decide which axis should spin
      const resolvedAxis = visualAxis === 'auto' ? 'x' : visualAxis
      if (resolvedAxis === 'x') wheelGroup.rotateX(rotation)
      if (resolvedAxis === 'y') wheelGroup.rotateY(rotation)
      if (resolvedAxis === 'z') wheelGroup.rotateZ(rotation)

      // Sync Debug Helpers + text overlays
      if (debug) {
        const dRef = debugWheelsRef[i].current
        if (dRef) {
          dRef.position.copy(wheelGroup.position)
          dRef.quaternion.copy(wheelGroup.quaternion)
        }
      }
    })
  })

  return (
    <group {...props} dispose={null}>
      <RigidBody
        enabledRotations={[true, true, true]}
        ref={chassisRef}
        colliders={false}
        type="dynamic"
        position={[0, 2, 0]}
        rotation={CHASSIS_ROTATION}
        mass={2500}
        canSleep={false}
        friction={0.5}
      >
        <CuboidCollider args={[0.8, 0.2, 0.35]} position={[0, 0.22, 0]} />

        <mesh
          geometry={carNodes.Object_2.geometry}
          material={carMaterials['Scene_-_Root']}
            position={[0, 0.22, 0]}
          castShadow
        />

        {/* Wheels - Direct Mesh Rendering */}
        <group>
          {WHEEL_SLOTS.map((slot, i) => {
            const meta = wheelVisualMeta[i]
            const correction = meta?.correction ?? [0, 0, 0]
            const axisIndex = meta ? AXIS_INDEX[meta.thinAxis] : 0
            const sourceWidth = meta ? meta.bbox.getComponent(axisIndex) : 1
            const normalizedWidth = sourceWidth > 0 ? wheelWidth / sourceWidth : 1
            const meshScale: [number, number, number] = [1, 1, 1]
            meshScale[axisIndex] = normalizedWidth
            const wheelMaterial =
              wheelMaterials['Scene_-_Root.002'] ??
              Object.values(wheelMaterials)[0]
            return (
              <group key={slot.id} ref={wheelsRef[i]}>
                <mesh
                  geometry={wheelNodes[slot.node].geometry}
                  material={wheelMaterial}
                  rotation={correction}
                  scale={meshScale}
                  castShadow
                />
              </group>
            )
          })}
        </group>

        {/* Debug Wireframes */}
        {debug &&
          WHEEL_SLOTS.map((slot, i) => (
            <group key={`${slot.id}-debug`} ref={debugWheelsRef[i]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth, 16]} />
                <meshBasicMaterial color="yellow" wireframe />
              </mesh>
              <axesHelper args={[0.5]} />
            </group>
          ))}
      </RigidBody>
    </group>
  )
}
