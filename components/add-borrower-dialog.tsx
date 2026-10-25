'use client'

import { type FormEvent, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBorrower } from '@/app/borrowers/actions'

export function AddBorrowerDialog() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!success) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess('')
    }, 3000)

    return () => window.clearTimeout(timeoutId)
  }, [success])

  function openDialog() {
    setError('')
    setSuccess('')
    setIsOpen(true)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setError('')
    setSuccess('')

    startTransition(async () => {
      const result = await createBorrower(formData)

      if (!result.success) {
        setError(result.message)
        return
      }

      form.reset()
      setIsOpen(false)
      setSuccess(result.message)
      router.refresh()
    })
  }

  return (
    <>
      {success && (
        <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-900 px-4 text-sm font-semibold text-white transition hover:bg-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2"
      >
        Tambah Peminjam
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-5 py-8" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="add-borrower-title" className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-borrower-title" className="text-xl font-bold tracking-tight text-slate-900">Tambah Peminjam</h2>
                <p className="mt-1 text-sm text-slate-500">Masukkan nama peminjam.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="text-sm font-medium text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
                Tutup
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="borrower-name" className="mb-2 block text-sm font-medium text-slate-700">Nama Peminjam</label>
                <input id="borrower-name" name="name" required autoFocus className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label htmlFor="borrower-address" className="mb-2 block text-sm font-medium text-slate-700">Alamat</label>
                <textarea id="borrower-address" name="address" rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                  Batal
                </button>
                <button type="submit" disabled={isPending} className="rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-60">
                  {isPending ? 'Menyimpan...' : 'Simpan Peminjam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
