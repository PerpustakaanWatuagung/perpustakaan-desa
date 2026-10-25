'use client'

import { type FormEvent, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBorrowing, searchBorrowingOptions, type BorrowingBookOption, type BorrowingBorrowerOption } from '@/app/borrowings/actions'

type AddBorrowingDialogProps = {
  defaultBorrowDate: string
}

function displayTitle(book: BorrowingBookOption) {
  return book.title?.trim() || book.title_initial?.trim() || 'Judul belum diketahui'
}

function displayBookDetails(book: BorrowingBookOption) {
  return `${book.classification_number?.trim() || '—'} · ${book.author_code?.trim() || '—'} · ${displayTitle(book)}`
}

export function AddBorrowingDialog({ defaultBorrowDate }: AddBorrowingDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, startTransition] = useTransition()
  const [borrowerQuery, setBorrowerQuery] = useState('')
  const [bookQuery, setBookQuery] = useState('')
  const [borrowerOptions, setBorrowerOptions] = useState<BorrowingBorrowerOption[]>([])
  const [bookOptions, setBookOptions] = useState<BorrowingBookOption[]>([])
  const [selectedBorrower, setSelectedBorrower] = useState<BorrowingBorrowerOption | null>(null)
  const [selectedBook, setSelectedBook] = useState<BorrowingBookOption | null>(null)
  const [searchError, setSearchError] = useState('')
  const [isSearchingBorrower, setIsSearchingBorrower] = useState(false)
  const [isSearchingBook, setIsSearchingBook] = useState(false)
  const searchRequestId = useRef(0)

  useEffect(() => {
    if (!success) return
    const timeoutId = window.setTimeout(() => setSuccess(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [success])

  function openDialog() {
    setError('')
    setSuccess('')
    setSearchError('')
    setBorrowerQuery('')
    setBookQuery('')
    setBorrowerOptions([])
    setBookOptions([])
    setSelectedBorrower(null)
    setSelectedBook(null)
    setIsSearchingBorrower(false)
    setIsSearchingBook(false)
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return

    const normalizedBorrowerQuery = borrowerQuery.trim()
    const normalizedBookQuery = bookQuery.trim()

    if (normalizedBorrowerQuery.length < 2 && normalizedBookQuery.length < 2) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const requestId = searchRequestId.current + 1
      searchRequestId.current = requestId
      setSearchError('')

      Promise.all([
        normalizedBorrowerQuery.length >= 2 ? searchBorrowingOptions(normalizedBorrowerQuery) : Promise.resolve(null),
        normalizedBookQuery.length >= 2 ? searchBorrowingOptions(normalizedBookQuery) : Promise.resolve(null),
      ]).then(([borrowerResult, bookResult]) => {
        if (requestId !== searchRequestId.current) return

        const failedResult = borrowerResult && !borrowerResult.success
          ? borrowerResult
          : bookResult && !bookResult.success
            ? bookResult
            : null

        if (failedResult) {
          setSearchError(failedResult.message)
          setBorrowerOptions([])
          setBookOptions([])
        } else {
          setBorrowerOptions(borrowerResult?.borrowers ?? [])
          setBookOptions(bookResult?.books ?? [])
        }
        setIsSearchingBorrower(false)
        setIsSearchingBook(false)
      }).catch(() => {
        if (requestId !== searchRequestId.current) return
        setSearchError('Gagal mencari pilihan. Silakan coba lagi.')
        setBorrowerOptions([])
        setBookOptions([])
        setIsSearchingBorrower(false)
        setIsSearchingBook(false)
      })
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [borrowerQuery, bookQuery, isOpen])

  function handleBorrowerQueryChange(value: string) {
    searchRequestId.current += 1
    setBorrowerQuery(value)
    setBorrowerOptions([])
    setSearchError('')
    setIsSearchingBorrower(value.trim().length >= 2)
  }

  function handleBookQueryChange(value: string) {
    searchRequestId.current += 1
    setBookQuery(value)
    setBookOptions([])
    setSearchError('')
    setIsSearchingBook(value.trim().length >= 2)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setError('')
    setSuccess('')

    startTransition(async () => {
      const result = await createBorrowing(new FormData(form))

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
      {success && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}
      <button type="button" onClick={openDialog} className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-900 px-4 text-sm font-semibold text-white transition hover:bg-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2">
        Tambah Peminjaman
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-5 py-8" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="add-borrowing-title" className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-borrowing-title" className="text-xl font-bold tracking-tight text-slate-900">Tambah Peminjaman</h2>
                <p className="mt-1 text-sm text-slate-500">Pilih peminjam dan buku yang tersedia.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50">Tutup</button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
              {searchError && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{searchError}</div>}
              <div>
                <label htmlFor="borrowing-borrower-search" className="mb-2 block text-sm font-medium text-slate-700">Peminjam</label>
                {selectedBorrower ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <span className="text-sm font-medium text-emerald-900">{selectedBorrower.name}</span>
                    <button type="button" onClick={() => { setSelectedBorrower(null); setBorrowerQuery('') }} className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">Ganti</button>
                  </div>
                ) : (
                  <>
                    <input id="borrowing-borrower-search" value={borrowerQuery} onChange={(event) => handleBorrowerQueryChange(event.target.value)} placeholder="Ketik minimal 2 karakter nama" autoComplete="off" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                    <div className="mt-2 rounded-md border border-slate-200 bg-white">
                      {borrowerQuery.trim().length < 2 ? <p className="px-3 py-2.5 text-sm text-slate-500">Masukkan minimal 2 karakter untuk mencari peminjam.</p> : isSearchingBorrower ? <p className="px-3 py-2.5 text-sm text-slate-500">Mencari peminjam...</p> : borrowerOptions.length === 0 ? <p className="px-3 py-2.5 text-sm text-slate-500">Peminjam tidak ditemukan.</p> : borrowerOptions.map((borrower) => <button key={borrower.id} type="button" onClick={() => { setSelectedBorrower(borrower); setBorrowerOptions([]) }} className="block w-full px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-emerald-50">{borrower.name}</button>)}
                    </div>
                  </>
                )}
                <input type="hidden" name="borrower_id" value={selectedBorrower?.id ?? ''} />
              </div>
              <div>
                <label htmlFor="borrowing-book-search" className="mb-2 block text-sm font-medium text-slate-700">Buku</label>
                {selectedBook ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <span className="text-sm font-medium text-emerald-900">{displayBookDetails(selectedBook)}</span>
                    <button type="button" onClick={() => { setSelectedBook(null); setBookQuery('') }} className="shrink-0 text-sm font-semibold text-emerald-800 hover:text-emerald-950">Ganti</button>
                  </div>
                ) : (
                  <>
                    <input id="borrowing-book-search" value={bookQuery} onChange={(event) => handleBookQueryChange(event.target.value)} placeholder="Cari klasifikasi, kode, atau judul (minimal 2 karakter)" autoComplete="off" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white">
                      {bookQuery.trim().length < 2 ? <p className="px-3 py-2.5 text-sm text-slate-500">Masukkan minimal 2 karakter untuk mencari buku.</p> : isSearchingBook ? <p className="px-3 py-2.5 text-sm text-slate-500">Mencari buku...</p> : bookOptions.length === 0 ? <p className="px-3 py-2.5 text-sm text-slate-500">Buku tersedia tidak ditemukan.</p> : bookOptions.map((book) => <button key={book.id} type="button" onClick={() => { setSelectedBook(book); setBookOptions([]) }} className="block w-full border-b border-slate-100 px-3 py-2.5 text-left text-sm text-slate-700 last:border-b-0 hover:bg-emerald-50"><span className="font-medium text-slate-900">{displayTitle(book)}</span><span className="mt-1 block text-xs text-slate-500">No. klasifikasi: {book.classification_number?.trim() || '—'} · Kode pengarang: {book.author_code?.trim() || '—'}</span></button>)}
                    </div>
                  </>
                )}
                <input type="hidden" name="book_id" value={selectedBook?.id ?? ''} />
              </div>
              <div>
                <label htmlFor="borrowing-date" className="mb-2 block text-sm font-medium text-slate-700">Tanggal Peminjaman</label>
                <input id="borrowing-date" name="borrow_date" type="date" required defaultValue={defaultBorrowDate} className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label htmlFor="borrowing-notes" className="mb-2 block text-sm font-medium text-slate-700">Catatan</label>
                <textarea id="borrowing-notes" name="notes" rows={3} placeholder="Opsional" className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Batal</button>
                <button type="submit" disabled={isPending} className="rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-60">{isPending ? 'Menyimpan...' : 'Simpan Peminjaman'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
