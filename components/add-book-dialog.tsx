'use client'

import { type FormEvent, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBook } from '@/app/books/actions'

type AddBookDialogProps = {
  categories: { id: string; name: string }[]
}

export function AddBookDialog({ categories }: AddBookDialogProps) {
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
      const result = await createBook(formData)

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
        disabled={categories.length === 0}
        className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-900 px-4 text-sm font-semibold text-white transition hover:bg-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Tambah Buku
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-5 py-8" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="add-book-title" className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-book-title" className="text-xl font-bold tracking-tight text-slate-900">Tambah Buku</h2>
                <p className="mt-1 text-sm text-slate-500">Isi data buku baru. Kolom bertanda wajib harus diisi.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="text-sm font-medium text-slate-500 hover:text-slate-900">
                Tutup
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="classification_number" className="mb-2 block text-sm font-medium text-slate-700">Nomor Klasifikasi</label>
                  <input id="classification_number" name="classification_number" placeholder="Opsional" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div>
                  <label htmlFor="author_code" className="mb-2 block text-sm font-medium text-slate-700">Kode Pengarang</label>
                  <input id="author_code" name="author_code" maxLength={3} placeholder="Contoh: HIS atau 123" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="title" className="mb-2 block text-sm font-medium text-slate-700">Judul Lengkap</label>
                  <input id="title" name="title" placeholder="Opsional" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div>
                  <label htmlFor="title_initial" className="mb-2 block text-sm font-medium text-slate-700">Huruf Awal Judul</label>
                  <input id="title_initial" name="title_initial" placeholder="Opsional" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div>
                  <label htmlFor="category_id" className="mb-2 block text-sm font-medium text-slate-700">Kategori <span className="text-red-600">*</span></label>
                  <select id="category_id" name="category_id" required defaultValue="" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100">
                    <option value="" disabled>Pilih kategori</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" disabled={isPending} className="rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-60">
                  {isPending ? 'Menyimpan...' : 'Simpan Buku'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
