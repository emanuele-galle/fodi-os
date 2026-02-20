import { redirect } from 'next/navigation'

export default function TimePage() {
  redirect('/team?tab=attendance')
}
