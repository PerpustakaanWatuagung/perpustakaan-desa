'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export type BorrowingActionResult = {
  success: boolean
  message: string
}

export type BorrowingBorrowerOption = {
  id: string
  name: string
}

export type BorrowingBookOption = {
  id: string
  classification_number: string | null
  author_code: string | null
  title_initial: string | null
  title: string | null
}

export type BorrowingOptionsResult = {
  success: boolean
  message: string
  borrowers: BorrowingBorrowerOption[]
  books: BorrowingBookOption[]
}

function formValue(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export async function searchBorrowingOptions(query: string): Promise<BorrowingOptionsResult> {
  const emptyResult = { borrowers: [], books: [] }
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    return { success: false, message: 'Sesi login tidak valid. Silakan masuk kembali.', ...emptyResult }
  }

  const normalizedQuery = query.trim()

  if (normalizedQuery.length < 2) {
    return { success: true, message: '', ...emptyResult }
  }

  const escapedQuery = normalizedQuery.replace(/[\\%_]/g, '\\$&')
  const pattern = `%${escapedQuery}%`
  const bookColumns = ['classification_number', 'author_code', 'title', 'title_initial'] as const
  const bookResults = await Promise.all(
    bookColumns.map((column) => supabase
      .from('books')
      .select('id, classification_number, author_code, title_initial, title')
      .eq('is_active', true)
      .ilike(column, pattern)
      .limit(20)),
  )

  const failedBookResult = bookResults.find((result) => result.error)

  if (failedBookResult?.error) {
    return { success: false, message: `Gagal mencari buku: ${failedBookResult.error.message}`, ...emptyResult }
  }

  const booksById = new Map<string, BorrowingBookOption>()

  for (const result of bookResults) {
    for (const book of result.data ?? []) {
      booksById.set(String(book.id), { ...book, id: String(book.id) })
    }
  }

  const bookIds = [...booksById.keys()]
  let unavailableBookIds = new Set<string>()

  if (bookIds.length > 0) {
    const activeBorrowingsResult = await supabase
      .from('borrowings')
      .select('book_id')
      .in('book_id', bookIds)
      .is('return_date', null)

    if (activeBorrowingsResult.error) {
      return { success: false, message: `Gagal memeriksa ketersediaan buku: ${activeBorrowingsResult.error.message}`, ...emptyResult }
    }

    unavailableBookIds = new Set((activeBorrowingsResult.data ?? []).map((borrowing) => String(borrowing.book_id)))
  }

  const borrowersResult = await supabase
    .from('borrowers')
    .select('id, name')
    .eq('is_active', true)
    .ilike('name', pattern)
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .limit(20)

  if (borrowersResult.error) {
    return { success: false, message: `Gagal mencari peminjam: ${borrowersResult.error.message}`, ...emptyResult }
  }

  return {
    success: true,
    message: '',
    borrowers: (borrowersResult.data ?? []).map((borrower) => ({ id: String(borrower.id), name: borrower.name })),
    books: [...booksById.values()]
      .filter((book) => !unavailableBookIds.has(book.id))
      .slice(0, 20),
  }
}

export async function createBorrowing(formData: FormData): Promise<BorrowingActionResult> {
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    return { success: false, message: 'Sesi login tidak valid. Silakan masuk kembali.' }
  }

  const borrowerId = formValue(formData, 'borrower_id')
  const bookId = formValue(formData, 'book_id')
  const borrowDate = formValue(formData, 'borrow_date')
  const notesValue = formValue(formData, 'notes')

  if (!borrowerId || !/^\d+$/.test(borrowerId)) {
    return { success: false, message: 'Peminjam yang dipilih tidak valid.' }
  }

  if (!bookId || !/^\d+$/.test(bookId)) {
    return { success: false, message: 'Buku yang dipilih tidak valid.' }
  }

  if (!isValidDate(borrowDate)) {
    return { success: false, message: 'Tanggal peminjaman tidak valid.' }
  }

  const [borrowerResult, bookResult, activeBorrowingResult] = await Promise.all([
    supabase.from('borrowers').select('id').eq('id', borrowerId).eq('is_active', true).maybeSingle(),
    supabase.from('books').select('id').eq('id', bookId).eq('is_active', true).maybeSingle(),
    supabase.from('borrowings').select('id').eq('book_id', bookId).is('return_date', null).maybeSingle(),
  ])

  if (borrowerResult.error) {
    return { success: false, message: `Gagal memeriksa peminjam: ${borrowerResult.error.message}` }
  }

  if (bookResult.error) {
    return { success: false, message: `Gagal memeriksa buku: ${bookResult.error.message}` }
  }

  if (activeBorrowingResult.error) {
    return { success: false, message: `Gagal memeriksa ketersediaan buku: ${activeBorrowingResult.error.message}` }
  }

  if (!borrowerResult.data) {
    return { success: false, message: 'Peminjam tidak ditemukan atau sudah nonaktif.' }
  }

  if (!bookResult.data) {
    return { success: false, message: 'Buku tidak ditemukan atau sudah nonaktif.' }
  }

  if (activeBorrowingResult.data) {
    return { success: false, message: 'Buku sudah dipinjam atau tidak lagi tersedia.' }
  }

  const { error } = await supabase.from('borrowings').insert({
    borrower_id: borrowerId,
    book_id: bookId,
    borrow_date: borrowDate,
    notes: notesValue || null,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, message: 'Buku sudah dipinjam atau tidak lagi tersedia.' }
    }

    return { success: false, message: `Gagal menyimpan peminjaman: ${error.message}` }
  }

  revalidatePath('/borrowings')
  revalidatePath('/books')
  revalidatePath('/')
  return { success: true, message: 'Peminjaman berhasil ditambahkan.' }
}

function todayInJakarta() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

export async function returnBorrowing(formData: FormData): Promise<BorrowingActionResult> {
  const supabase = await createSupabaseServerClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    return { success: false, message: 'Sesi login tidak valid. Silakan masuk kembali.' }
  }

  const id = formValue(formData, 'id')
  if (!id || !/^[1-9]\d*$/.test(id)) {
    return { success: false, message: 'Transaksi yang akan dikembalikan tidak valid.' }
  }

  const returnDate = todayInJakarta()
  const borrowingResult = await supabase
    .from('borrowings')
    .select('borrow_date')
    .eq('id', id)
    .is('return_date', null)
    .maybeSingle()

  if (borrowingResult.error) {
    return { success: false, message: 'Gagal memeriksa transaksi pengembalian.' }
  }

  if (!borrowingResult.data) {
    return { success: false, message: 'Transaksi tidak ditemukan atau sudah dikembalikan.' }
  }

  if (returnDate < borrowingResult.data.borrow_date) {
    return { success: false, message: 'Tanggal pengembalian tidak valid.' }
  }

  const { data: returnedBorrowing, error } = await supabase
    .from('borrowings')
    .update({ return_date: returnDate })
    .eq('id', id)
    .is('return_date', null)
    .select('id')
    .maybeSingle()

  if (error) {
    return { success: false, message: 'Gagal menyimpan pengembalian. Silakan coba lagi.' }
  }

  if (!returnedBorrowing) {
    return { success: false, message: 'Transaksi tidak ditemukan atau sudah dikembalikan.' }
  }

  revalidatePath('/returns')
  revalidatePath('/borrowings')
  revalidatePath('/books')
  revalidatePath('/')
  return { success: true, message: 'Buku berhasil dikembalikan.' }
}
