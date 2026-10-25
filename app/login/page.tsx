'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icons'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Email atau kata sandi salah.')
        setIsLoading(false)
        return
      }
    } catch {
      setError('Email atau kata sandi salah.')
      setIsLoading(false)
      return
    }

    router.replace('/')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/70 sm:px-10 sm:py-10">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-900 text-white">
              <Icon name="book" className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">Perpustakaan Desa Watuagung</h1>
            <p className="mt-2 text-sm text-slate-500">Panel Administrasi Perpustakaan</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input id="email" name="email" type="email" required placeholder="Masukkan email" className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Kata Sandi</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} required placeholder="Masukkan kata sandi" className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                <button type="button" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700">
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="h-11 w-full rounded-md bg-emerald-900 text-sm font-semibold text-white transition hover:bg-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70">
              {isLoading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">Akses khusus perangkat Desa Watuagung</p>
      </div>
    </main>
  )
}
