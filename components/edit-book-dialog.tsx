'use client'

import { type FormEvent, useEffect, useState, useTransition } from 'react'
import { updateBook } from '@/app/books/actions'

type EditBookDialogProps = {
  book: {
    id: string
    classification_number: string | null
    author_code: string | null
    title_initial: string | null
    title: string | null
    category_id: string | null
  }
  categories: { id: string; name: string }[]
}

export function EditBookDialog({ book, categories }: EditBookDialogProps) {
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
      const result = await updateBook(formData)

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
      <button
        type="button"
        onClick={openDialog}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Edit
      </button>
      {success && <p role="status" className="mt-2 text-xs font-medium text-emerald-700">{success}</p>}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-5 py-8" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby={`edit-book-title-${book.id}`} className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`edit-book-title-${book.id}`} className="text-xl font-bold tracking-tight text-slate-900">Edit Buku</h2>
                <p className="mt-1 text-sm text-slate-500">Perbarui data buku. Kolom bertanda wajib harus diisi.</p>
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
              <input type="hidden" name="id" value={book.id} />
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor={`edit-classification-number-${book.id}`} className="mb-2 block text-sm font-medium text-slate-700">Nomor Klasifikasi</label>
                  <input id={`edit-classification-number-${book.id}`} name="classification_number" defaultValue={book.classification_number ?? ''} placeholder="Opsional" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div>
                  <label htmlFor={`edit-author-code-${book.id}`} className="mb-2 block text-sm font-medium text-slate-700">Kode Pengarang</label>
                  <input id={`edit-author-code-${book.id}`} name="author_code" defaultValue={book.author_code ?? ''} maxLength={3} placeholder="Contoh: HIS atau 123" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={`edit-title-${book.id}`} className="mb-2 block text-sm font-medium text-slate-700">Judul Lengkap</label>
                  <input id={`edit-title-${book.id}`} name="title" defaultValue={book.title ?? ''} placeholder="Opsional" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div>
                  <label htmlFor={`edit-title-initial-${book.id}`} className="mb-2 block text-sm font-medium text-slate-700">Huruf Awal Judul</label>
                  <input id={`edit-title-initial-${book.id}`} name="title_initial" defaultValue={book.title_initial ?? ''} placeholder="Opsional" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div>
                  <label htmlFor={`edit-category-${book.id}`} className="mb-2 block text-sm font-medium text-slate-700">Kategori <span className="text-red-600">*</span></label>
                  <select id={`edit-category-${book.id}`} name="category_id" required defaultValue={book.category_id ?? ''} className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100">
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
