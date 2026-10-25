'use client'

import { type FormEvent, useEffect, useState, useTransition } from 'react'
import { updateBorrower } from '@/app/borrowers/actions'

type EditBorrowerDialogProps = {
  borrower: {
    id: string
    name: string
    address: string | null
  }
}

export function EditBorrowerDialog({ borrower }: EditBorrowerDialogProps) {
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
    const formData = new FormData(event.currentTarget)
    setError('')
    setSuccess('')

    startTransition(async () => {
      const result = await updateBorrower(formData)

      if (!result.success) {
        setError(result.message)
        return
      }

      setIsOpen(false)
      setSuccess(result.message)
    })
  }

  return (
    <>
      <button type="button" onClick={openDialog} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        Edit
      </button>
      {success && <span role="status" className="self-center text-xs font-medium text-emerald-700">{success}</span>}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-5 py-8" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby={`edit-borrower-title-${borrower.id}`} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`edit-borrower-title-${borrower.id}`} className="text-xl font-bold tracking-tight text-slate-900">Edit Peminjam</h2>
                <p className="mt-1 text-sm text-slate-500">Perbarui nama dan alamat peminjam.</p>
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
              <input type="hidden" name="id" value={borrower.id} />
              <div>
                <label htmlFor={`edit-borrower-name-${borrower.id}`} className="mb-2 block text-sm font-medium text-slate-700">Nama Peminjam</label>
                <input id={`edit-borrower-name-${borrower.id}`} name="name" required defaultValue={borrower.name} autoFocus className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label htmlFor={`edit-borrower-address-${borrower.id}`} className="mb-2 block text-sm font-medium text-slate-700">Alamat</label>
                <textarea id={`edit-borrower-address-${borrower.id}`} name="address" rows={3} defaultValue={borrower.address ?? ''} className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                  Batal
                </button>
                <button type="submit" disabled={isPending} className="rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-60">
                  {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
