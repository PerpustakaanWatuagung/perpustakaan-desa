'use client'

import { type FormEvent, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { returnBorrowing } from '@/app/borrowings/actions'

type ReturnBorrowingDialogProps = {
  borrowing: {
    id: string
    borrowerName: string
    classification: string
    authorCode: string
    title: string
    borrowDate: string
  }
}

export function ReturnBorrowingDialog({ borrowing }: ReturnBorrowingDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!success) return
    const timeoutId = window.setTimeout(() => setSuccess(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [success])

  function openDialog() {
    setError('')
    setSuccess('')
    setIsOpen(true)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await returnBorrowing(formData)

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
        <button type="button" onClick={openDialog} className="rounded-md bg-emerald-900 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-950">
          Kembalikan
        </button>
        {success && <span role="status" className="self-center text-xs font-medium text-emerald-700">{success}</span>}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-5 py-8" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby={`return-borrowing-title-${borrowing.id}`} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`return-borrowing-title-${borrowing.id}`} className="text-xl font-bold tracking-tight text-slate-900">Kembalikan Buku</h2>
                <p className="mt-1 text-sm text-slate-500">Pastikan transaksi yang dipilih sudah benar.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50">Tutup</button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
              <input type="hidden" name="id" value={borrowing.id} />
              <dl className="space-y-3 rounded-md bg-slate-50 p-4 text-sm">
                <div className="flex gap-3"><dt className="w-36 shrink-0 font-medium text-slate-500">Peminjam</dt><dd className="text-slate-900">{borrowing.borrowerName}</dd></div>
                <div className="flex gap-3"><dt className="w-36 shrink-0 font-medium text-slate-500">Buku</dt><dd className="text-slate-900">{borrowing.title}</dd></div>
                <div className="flex gap-3"><dt className="w-36 shrink-0 font-medium text-slate-500">Klasifikasi</dt><dd className="text-slate-900">{borrowing.classification}</dd></div>
                <div className="flex gap-3"><dt className="w-36 shrink-0 font-medium text-slate-500">Kode pengarang</dt><dd className="text-slate-900">{borrowing.authorCode}</dd></div>
                <div className="flex gap-3"><dt className="w-36 shrink-0 font-medium text-slate-500">Tanggal pinjam</dt><dd className="text-slate-900">{borrowing.borrowDate}</dd></div>
              </dl>
              <p className="text-sm leading-6 text-slate-600">Tanggal pengembalian akan diisi dengan tanggal hari ini.</p>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Batal</button>
                <button type="submit" disabled={isPending} className="rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-950 disabled:opacity-60">{isPending ? 'Memproses...' : 'Konfirmasi Pengembalian'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
