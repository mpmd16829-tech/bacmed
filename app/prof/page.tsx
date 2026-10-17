import type { Metadata } from 'next'
import { TeacherSpace } from '@/components/teacher-space'

export const metadata: Metadata = {
  title: 'Espace enseignant — PrépaBAC',
  robots: { index: false, follow: false },
}

export default function ProfPage() {
  return <TeacherSpace />
}
