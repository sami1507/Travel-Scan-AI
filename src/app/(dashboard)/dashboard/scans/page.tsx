import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function ScansPage() {
  // Redirect to saved trips - analysis history is shown there
  redirect('/dashboard/saved')
}
