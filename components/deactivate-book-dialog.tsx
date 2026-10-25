'use client'

import { type FormEvent, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deactivateBook } from '@/app/books/actions'

type DeactivateBookDialogProps = {
  book: {
    id: string
    classification_number: string | null
    title_initial: string | null
    title: string | null
  }
}

function displayTitle(book: DeactivateBookDialogProps['book']) {
  return book.title?.trim() || book.title_initial?.trim() || 'Judul belum diketahui'
}

export function DeactivateBookDialog({ book }: DeactivateBookDialogProps) {
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
    const formData = new FormData(event.currentTarget)
    setError('')
    setSuccess('')

    startTransition(async () => {
      const result = await deactivateBook(formData)

      if (!result.success) {
        setError(result.message)
        return
      }

      setIsOpen(false)
      setSuccess(result.message)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openDialog}
          className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Nonaktifkan
        </button>
        {success && <span role="status" className="self-center text-xs font-medium text-emerald-700">{success}</span>}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-5 py-8" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby={`deactivate-book-title-${book.id}`} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`deactivate-book-title-${book.id}`} className="text-xl font-bold tracking-tight text-slate-900">Nonaktifkan Buku</h2>
                <p className="mt-1 text-sm text-slate-500">Pastikan buku yang dipilih sudah benar.</p>
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
              <input type="hidden" name="id" value={book.id} />
              <dl className="space-y-3 rounded-md bg-slate-50 p-4 text-sm">
                <div className="flex gap-3">
                  <dt className="w-36 shrink-0 font-medium text-slate-500">No. Klasifikasi</dt>
                  <dd className="text-slate-900">{book.classification_number?.trim() || '—'}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-36 shrink-0 font-medium text-slate-500">Judul</dt>
                  <dd className="text-slate-900">{displayTitle(book)}</dd>
                </div>
              </dl>
              <p className="text-sm leading-6 text-slate-600">
                Buku yang dinonaktifkan tidak akan muncul lagi dalam daftar buku aktif dan tidak dapat dipinjam lagi. Riwayat peminjaman buku tetap dipertahankan.
              </p>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                  Batal
                </button>
                <button type="submit" disabled={isPending} className="rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {isPending ? 'Menonaktifkan...' : 'Nonaktifkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
