import type { RapierRigidBody } from '@react-three/rapier'
import { create } from 'zustand'

type CarRigState = {
  carBody: RapierRigidBody | null
  setCarBody: (body: RapierRigidBody | null) => void
}

export const useCarRigStore = create<CarRigState>(set => ({
  carBody: null,
  setCarBody: body => set({ carBody: body }),
}))
