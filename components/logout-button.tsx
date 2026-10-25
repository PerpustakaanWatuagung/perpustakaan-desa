'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Icon } from '@/components/icons'
import { supabase } from '@/lib/supabase'

export function LogoutButton() {
  const router = useRouter()
  const [error, setError] = useState('')

  async function handleLogout() {
    setError('')
    let signOutError: Error | null = null

    try {
      const { error } = await supabase.auth.signOut()
      signOutError = error
    } catch {
      signOutError = new Error('Logout request failed')
    }

    if (signOutError) {
      setError('Gagal keluar. Silakan coba lagi.')
      return
    }

    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      {error && <p role="alert" className="mb-2 px-3 text-xs text-red-700">{error}</p>}
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700"
      >
        <Icon name="logout" className="h-[18px] w-[18px]" />
        Keluar
      </button>
    </>
  )
}
