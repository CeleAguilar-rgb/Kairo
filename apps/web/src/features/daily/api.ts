import 'server-only'

import { getMockContext, mockDelay } from '@/lib/mock/context'

import { buildGoals, buildMealsToday, buildRoutineToday } from './mock'
import type { Goal, MealPlan, RoutineBlockToday } from './types'

export async function getRoutineToday(): Promise<RoutineBlockToday[]> {
  const ctx = await getMockContext()
  await mockDelay()
  return buildRoutineToday(ctx)
}

export async function getMealsToday(): Promise<MealPlan[]> {
  const ctx = await getMockContext()
  await mockDelay()
  return buildMealsToday(ctx)
}

export async function listGoals(): Promise<Goal[]> {
  const ctx = await getMockContext()
  await mockDelay()
  return buildGoals(ctx)
}
