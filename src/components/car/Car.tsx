import * as THREE from 'three'
import { useRef, useEffect, type JSX } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useKeyboardControls } from '@react-three/drei'
import { RigidBody, useRapier, RapierRigidBody, CuboidCollider } from '@react-three/rapier'
import { useControls } from 'leva'

// Exact positions from your file
const WHEEL_POSITIONS = [
  { x: 0.25,  y: 0.106, z: 0.531 },   // Front Left
  { x: -0.253, y: 0.107, z: 0.544 },  // Front Right
  { x: 0.235,  y: 0.105, z: -0.381 }, // Back Left
  { x: -0.244, y: 0.106, z: -0.38 },  // Back Right
]

type CarProps = JSX.IntrinsicElements['group']

export default function Car(props: CarProps) {
  const { world } = useRapier()
  const chassisRef = useRef<RapierRigidBody>(null)
  const vehicleController = useRef<any>(null)
  
  const { nodes: carNodes, materials: carMaterials } = useGLTF('/car-transformed.glb') as any
  const { nodes: wheelNodes, materials: wheelMaterials } = useGLTF('/wheels.glb') as any

  const [_, getKeys] = useKeyboardControls()

  const wheelsRef = [
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
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
    suspensionDamping,
    suspensionRestLength,
    wheelRadius,
    // Visual Alignment Fixes
    meshRotateY,
    visualAxis,
    debug
  } = useControls('Car Config', {
    // Drive
    engineForce: { value: 1, min: 0, max: 500 },
    brakeForce: { value: 0.01, min: 0, max: 50 },
    driveDir: { value: -1, options: { Forward: 1, Backward: -1 }, label: "Motor Direction" }, // Toggle this if W is backwards
    maxSteer: { value: 0.5, min: 0.1, max: 1 },
    
    // Suspension
    suspensionStiffness: { value: 50, min: 10, max: 100 },
    suspensionDamping: { value: 2.5, min: 0.1, max: 10 },
    suspensionRestLength: { value: 0.15, min: 0.05, max: 0.5 },
    wheelRadius: { value: 0.11, min: 0.05, max: 0.3 },

    // VISUAL FIXES - Use these to fix the "No Rotation" issue
    meshRotateY: { value: 0, min: 0, max: 360, step: 90, label: "Mesh Correction Y" },
    visualAxis: { value: 'x', options: ['x', 'y', 'z'], label: "Spin Axis" }, // Try changing this if wheels don't roll!
    
    debug: { value: true }
  })

  // Physics Setup
  useEffect(() => {
    if (!chassisRef.current || !world) return

    const vehicle = world.createVehicleController(chassisRef.current)
    const suspensionDirection = { x: 0, y: -1, z: 0 }
    const axleAxis = { x: 1, y: 0, z: 0 }

    WHEEL_POSITIONS.forEach((pos) => {
      vehicle.addWheel(pos, suspensionDirection, axleAxis, suspensionRestLength, wheelRadius)
    })

    vehicleController.current = vehicle

    return () => {
      if (vehicleController.current) {
        world.removeVehicleController(vehicleController.current)
        vehicleController.current = null
      }
    }
  }, [world, suspensionRestLength, wheelRadius])

  // Loop
  useFrame((state, delta) => {
    if (!vehicleController.current || !chassisRef.current) return

    const { forward, backward, left, right, brake } = getKeys()
    const vehicle = vehicleController.current

    // 1. Update Suspension Live
    for (let i = 0; i < 4; i++) {
        vehicle.setWheelSuspensionStiffness(i, suspensionStiffness)
        if (vehicle.setWheelSuspensionCompression) vehicle.setWheelSuspensionCompression(i, suspensionDamping)
        if (vehicle.setWheelSuspensionRelaxation) vehicle.setWheelSuspensionRelaxation(i, suspensionDamping)
    }

    // 2. Drive (AWD - All Wheels Powered to see rotation)
    const force = (forward ? engineForce : backward ? -engineForce : 0) * driveDir
    
    vehicle.setWheelEngineForce(0, force) // Front Left
    vehicle.setWheelEngineForce(1, force) // Front Right
    vehicle.setWheelEngineForce(2, force) // Back Left
    vehicle.setWheelEngineForce(3, force) // Back Right

    // 3. Steer
    const steer = left ? maxSteer : right ? -maxSteer : 0
    vehicle.setWheelSteering(0, steer)
    vehicle.setWheelSteering(1, steer)

    // 4. Brake
    const b = brake ? brakeForce : 0
    for(let i=0; i<4; i++) vehicle.setWheelBrake(i, b)

    vehicle.updateVehicle(delta)

    // 5. Sync Visuals
    wheelsRef.forEach((ref, i) => {
      if (!ref.current) return

      // Get Physics Data
      const connection = vehicle.wheelChassisConnectionPointCs(i)
      const suspensionLen = vehicle.wheelSuspensionLength ? vehicle.wheelSuspensionLength(i) : suspensionRestLength
      const steering = vehicle.wheelSteering(i) || 0
      const rotation = vehicle.wheelRotation(i) || 0

      // Position
      ref.current.position.set(connection.x, connection.y - suspensionLen, connection.z)

      // Rotation Logic
      ref.current.rotation.set(0, 0, 0) // Reset
      
      // 1. Apply Steering (Y axis)
      ref.current.rotateY(steering)

      // 2. Apply Mesh Correction (If your mesh is 90deg off)
      ref.current.rotateY(THREE.MathUtils.degToRad(meshRotateY))

      // 3. Apply Rolling (Spin)
      // We use the 'visualAxis' slider to decide which local axis spins.
      // Standard is 'X', but your mesh might need 'Z' or 'Y'.
      if (visualAxis === 'x') ref.current.rotateX(rotation)
      if (visualAxis === 'y') ref.current.rotateY(rotation)
      if (visualAxis === 'z') ref.current.rotateZ(rotation)

      // Sync Debug
      if (debug && debugWheelsRef[i].current) {
         const dRef = debugWheelsRef[i].current
         dRef.position.copy(ref.current.position)
         dRef.rotation.set(0,0,0)
         dRef.rotateY(steering)
         dRef.rotateX(rotation)
      }
    })
  })

  return (
    <group {...props} dispose={null}>
      <RigidBody 
        ref={chassisRef} 
        colliders={false} 
        type="dynamic" 
        position={[0, 2, 0]} 
        mass={2500}
        canSleep={false}
        friction={0.5}
      >
        <CuboidCollider args={[0.35, 0.2, 0.8]} position={[0, 0.22, 0]} />

        <mesh geometry={carNodes.Object_2.geometry} material={carMaterials['Scene_-_Root']} position={[0, 0.22, 0]} castShadow />

        {/* Wheels - Direct Mesh Rendering */}
        <group>
            <mesh ref={wheelsRef[0]} geometry={wheelNodes['front-left'].geometry} material={wheelMaterials['Scene_-_Root']} castShadow />
            <mesh ref={wheelsRef[1]} geometry={wheelNodes['front-right'].geometry} material={wheelMaterials['Scene_-_Root']} castShadow />
            <mesh ref={wheelsRef[2]} geometry={wheelNodes['back-left'].geometry} material={wheelMaterials['Scene_-_Root']} castShadow />
            <mesh ref={wheelsRef[3]} geometry={wheelNodes['back-left001'].geometry} material={wheelMaterials['Scene_-_Root']} castShadow />
        </group>

        {/* Debug Wireframes */}
        {debug && WHEEL_POSITIONS.map((_, i) => (
          <group key={i} ref={debugWheelsRef[i]}>
             <mesh rotation={[0, 0, 0]}>
                <cylinderGeometry args={[wheelRadius, wheelRadius, 0.15, 16]} />
                <meshBasicMaterial color="yellow" wireframe />
             </mesh>
             <axesHelper args={[0.5]} />
          </group>
        ))}
      </RigidBody>
    </group>
  )
}