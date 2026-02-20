import { redirect } from 'next/navigation'

export default function TeamActivityPage() {
  redirect('/team?tab=activity')
}
