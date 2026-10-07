'use client'

import { useState } from 'react'
import { LessonSteps } from '@/components/features/lessons/LessonSteps'

/** The lesson's pagination dots, live: tap one to move the current step. */
export function LessonStepsDemo() {
  const [current, setCurrent] = useState(1)
  return <LessonSteps current={current} steps={['G', 'C', 'D', 'Em', 'Am']} onSelect={setCurrent} />
}
