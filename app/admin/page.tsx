import type { Metadata } from 'next'
import { AdminConsole } from '@/components/admin-console'

export const metadata: Metadata = {
  title: 'Console PrépaBAC',
  robots: { index: false, follow: false },
}

/** Route directe de la console — le même écran s'ouvre aussi après 5 clics sur le logo. */
export default function AdminPage() {
  return <AdminConsole />
}
