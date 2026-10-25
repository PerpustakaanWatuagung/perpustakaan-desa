import Link from 'next/link'
import { connection } from 'next/server'
import { AddBorrowingDialog } from '@/components/add-borrowing-dialog'
import { LiveSearchFilter } from '@/components/live-search-filter'
import { Sidebar } from '@/components/sidebar'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const instant = false

const pageSize = 20

type SearchParams = { search?: string; page?: string }
type Book = { id: string; classification_number: string | null; author_code: string | null; title_initial: string | null; title: string | null; is_active?: boolean }
type Borrower = { id: string; name: string; is_active?: boolean }
type Borrowing = { id: string; borrower_id: string; book_id: string; borrow_date: string; notes: string | null; borrower: Borrower | null; book: Book | null }

type BorrowingPage = {
  borrowings: Borrowing[]
  totalCount: number
  currentPage: number
  totalPages: number
  search: string
  defaultBorrowDate: string
}

function todayInJakarta() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

function displayTitle(book: Book | null) {
  return book?.title?.trim() || book?.title_initial?.trim() || 'Judul belum diketahui'
}

function matchesSearch(borrowing: Borrowing, search: string) {
  if (!search) return true
  const values = [
    borrowing.borrower?.name,
    borrowing.book?.classification_number,
    borrowing.book?.author_code,
    borrowing.book?.title,
    borrowing.book?.title_initial,
  ]
  return values.some((value) => value?.toLocaleLowerCase('id-ID').includes(search.toLocaleLowerCase('id-ID')))
}

async function getBorrowingPage(searchParams: SearchParams): Promise<BorrowingPage> {
  const supabase = await createSupabaseServerClient()
  const search = searchParams.search?.trim() ?? ''
  const parsedPage = Number.parseInt(searchParams.page ?? '1', 10)
  const requestedPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const [borrowingsResult, borrowersResult, booksResult] = await Promise.all([
    supabase.from('borrowings').select('id, borrower_id, book_id, borrow_date, notes').is('return_date', null).order('borrow_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('borrowers').select('id, name, is_active').order('name', { ascending: true }).order('id', { ascending: true }),
    supabase.from('books').select('id, classification_number, author_code, title_initial, title, is_active').order('classification_number', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
  ])

  if (borrowingsResult.error) throw new Error(`Gagal mengambil data peminjaman: ${borrowingsResult.error.message}`)
  if (borrowersResult.error) throw new Error(`Gagal mengambil data peminjam: ${borrowersResult.error.message}`)
  if (booksResult.error) throw new Error(`Gagal mengambil data buku: ${booksResult.error.message}`)

  const allBorrowers = (borrowersResult.data ?? []).map((borrower) => ({ id: String(borrower.id), name: borrower.name, is_active: borrower.is_active }))
  const allBooks = (booksResult.data ?? []).map((book) => ({ ...book, id: String(book.id), is_active: book.is_active }))
  const borrowerById = new Map(allBorrowers.map((borrower) => [borrower.id, borrower]))
  const bookById = new Map(allBooks.map((book) => [book.id, book]))
  const borrowings = (borrowingsResult.data ?? [])
    .map((borrowing) => ({
      id: String(borrowing.id),
      borrower_id: String(borrowing.borrower_id),
      book_id: String(borrowing.book_id),
      borrow_date: borrowing.borrow_date,
      notes: borrowing.notes,
      borrower: borrowerById.get(String(borrowing.borrower_id)) ?? null,
      book: bookById.get(String(borrowing.book_id)) ?? null,
    }))
    .filter((borrowing) => matchesSearch(borrowing, search))

  const totalCount = borrowings.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1
  const pageStart = (currentPage - 1) * pageSize

  return {
    borrowings: borrowings.slice(pageStart, pageStart + pageSize),
    totalCount,
    currentPage,
    totalPages,
    search,
    defaultBorrowDate: todayInJakarta(),
  }
}

function pageHref(page: number, search: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('page', String(page))
  return `/borrowings?${params.toString()}`
}

function BorrowingsContent({ data }: { data: BorrowingPage }) {
  return (
    <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Peminjaman</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola peminjaman buku yang masih berlangsung.</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-500">{data.totalCount.toLocaleString('id-ID')} peminjaman aktif</p>
          <AddBorrowingDialog defaultBorrowDate={data.defaultBorrowDate} />
        </div>
      </div>

      <LiveSearchFilter queryParam="search" label="Cari Peminjaman" value={data.search} placeholder="Cari nama, nomor klasifikasi, kode pengarang, atau judul">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tanggal</th>
                  <th className="px-5 py-3 font-semibold">Peminjam</th>
                  <th className="px-5 py-3 font-semibold">Buku</th>
                  <th className="px-5 py-3 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.borrowings.map((borrowing) => (
                  <tr key={borrowing.id} className="text-slate-700">
                    <td className="whitespace-nowrap px-5 py-4">{borrowing.borrow_date}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{borrowing.borrower?.name || 'Peminjam tidak diketahui'}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{displayTitle(borrowing.book)}</p>
                      <p className="mt-1 text-xs text-slate-500">No. klasifikasi: {borrowing.book?.classification_number?.trim() || '—'} · Kode pengarang: {borrowing.book?.author_code?.trim() || '—'}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{borrowing.notes?.trim() || '—'}</td>
                  </tr>
                ))}
                {data.borrowings.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">{data.search ? 'Tidak ada peminjaman yang sesuai dengan pencarian.' : 'Belum ada peminjaman aktif.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {data.totalCount > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Halaman {data.currentPage} dari {data.totalPages}</span>
              <div className="flex gap-2">
                {data.currentPage > 1 && <Link href={pageHref(data.currentPage - 1, data.search)} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">Sebelumnya</Link>}
                {data.currentPage < data.totalPages && <Link href={pageHref(data.currentPage + 1, data.search)} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">Berikutnya</Link>}
              </div>
            </div>
          )}
        </section>
      </LiveSearchFilter>
    </div>
  )
}

export default async function BorrowingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection()
  let data: BorrowingPage | null = null
  let dataError = ''

  try {
    data = await getBorrowingPage(await searchParams)
  } catch (error) {
    dataError = error instanceof Error ? error.message : 'Gagal memuat data peminjaman.'
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <Sidebar active="borrowings" />
      <main className="min-w-0 flex-1">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div><p className="text-sm font-semibold text-emerald-800">Panel Admin</p><p className="mt-1 text-sm text-slate-500">Perpustakaan Desa Watuagung</p></div>
        </header>
        {dataError ? <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 lg:m-10" role="alert">{dataError}</div> : data ? <BorrowingsContent data={data} /> : null}
      </main>
    </div>
  )
}
