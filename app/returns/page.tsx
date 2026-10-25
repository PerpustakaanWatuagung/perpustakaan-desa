import Link from 'next/link'
import { connection } from 'next/server'
import { ReturnBorrowingDialog } from '@/components/return-borrowing-dialog'
import { LiveSearchFilter } from '@/components/live-search-filter'
import { Sidebar } from '@/components/sidebar'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const instant = false
const pageSize = 20

type SearchParams = { search?: string; page?: string }
type Book = { id: string; classification_number: string | null; author_code: string | null; title_initial: string | null; title: string | null }
type Borrower = { id: string; name: string }
type ReturnRow = { id: string; borrower_id: string; book_id: string; borrow_date: string; notes: string | null; borrower: Borrower | null; book: Book | null }
type ReturnsPage = { rows: ReturnRow[]; totalCount: number; currentPage: number; totalPages: number; search: string }

function displayTitle(book: Book | null) {
  return book?.title?.trim() || book?.title_initial?.trim() || 'Judul belum diketahui'
}

function matchesSearch(row: ReturnRow, search: string) {
  if (!search) return true
  const normalizedSearch = search.toLocaleLowerCase('id-ID')
  return [
    row.borrower?.name,
    row.book?.classification_number,
    row.book?.author_code,
    row.book?.title,
    row.book?.title_initial,
  ].some((value) => value?.toLocaleLowerCase('id-ID').includes(normalizedSearch))
}

async function getReturnsPage(searchParams: SearchParams): Promise<ReturnsPage> {
  const supabase = await createSupabaseServerClient()
  const search = searchParams.search?.trim() ?? ''
  const parsedPage = Number.parseInt(searchParams.page ?? '1', 10)
  const requestedPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const borrowingsResult = await supabase
    .from('borrowings')
    .select('id, borrower_id, book_id, borrow_date, notes')
    .is('return_date', null)
    .order('borrow_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (borrowingsResult.error) throw new Error(`Gagal mengambil data pengembalian: ${borrowingsResult.error.message}`)

  const activeBorrowings = borrowingsResult.data ?? []

  if (activeBorrowings.length === 0) {
    return { rows: [], totalCount: 0, currentPage: 1, totalPages: 1, search }
  }

  const bookIds = [...new Set(activeBorrowings.map((borrowing) => String(borrowing.book_id)))]
  const borrowerIds = [...new Set(activeBorrowings.map((borrowing) => String(borrowing.borrower_id)))]
  const [borrowersResult, booksResult] = await Promise.all([
    supabase.from('borrowers').select('id, name').in('id', borrowerIds),
    supabase.from('books').select('id, classification_number, author_code, title_initial, title').in('id', bookIds),
  ])

  if (borrowersResult.error) throw new Error(`Gagal mengambil detail peminjam: ${borrowersResult.error.message}`)
  if (booksResult.error) throw new Error(`Gagal mengambil detail buku: ${booksResult.error.message}`)

  const borrowers = (borrowersResult.data ?? []).map((borrower) => ({ id: String(borrower.id), name: borrower.name }))
  const books = (booksResult.data ?? []).map((book) => ({ ...book, id: String(book.id) }))
  const borrowersById = new Map(borrowers.map((borrower) => [borrower.id, borrower]))
  const booksById = new Map(books.map((book) => [book.id, book]))
  const missingBookIds = bookIds.filter((bookId) => !booksById.has(bookId))
  const missingBorrowerIds = borrowerIds.filter((borrowerId) => !borrowersById.has(borrowerId))

  if (missingBookIds.length > 0) {
    throw new Error(`Relasi buku tidak ditemukan untuk ${missingBookIds.length} transaksi aktif.`)
  }

  if (missingBorrowerIds.length > 0) {
    throw new Error(`Relasi peminjam tidak ditemukan untuk ${missingBorrowerIds.length} transaksi aktif.`)
  }

  const rows = activeBorrowings
    .map((borrowing) => ({
      id: String(borrowing.id),
      borrower_id: String(borrowing.borrower_id),
      book_id: String(borrowing.book_id),
      borrow_date: borrowing.borrow_date,
      notes: borrowing.notes,
      borrower: borrowersById.get(String(borrowing.borrower_id))!,
      book: booksById.get(String(borrowing.book_id))!,
    }))
    .filter((row) => matchesSearch(row, search))

  const totalCount = rows.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1
  return { rows: rows.slice((currentPage - 1) * pageSize, currentPage * pageSize), totalCount, currentPage, totalPages, search }
}

function pageHref(page: number, search: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('page', String(page))
  return `/returns?${params.toString()}`
}

function ReturnsContent({ data }: { data: ReturnsPage }) {
  return (
    <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Pengembalian</h1><p className="mt-1 text-sm text-slate-500">Kelola buku yang masih dipinjam.</p></div>
        <p className="text-sm text-slate-500">{data.totalCount.toLocaleString('id-ID')} transaksi aktif</p>
      </div>
      <LiveSearchFilter queryParam="search" label="Cari Pengembalian" value={data.search} placeholder="Cari nama, klasifikasi, kode pengarang, atau judul">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Tanggal Pinjam</th><th className="px-5 py-3 font-semibold">Peminjam</th><th className="px-5 py-3 font-semibold">Buku</th><th className="px-5 py-3 font-semibold">Catatan</th><th className="px-5 py-3 font-semibold">Aksi</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((row) => (
                  <tr key={row.id} className="text-slate-700">
                    <td className="whitespace-nowrap px-5 py-4">{row.borrow_date}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{row.borrower?.name || 'Peminjam tidak diketahui'}</td>
                    <td className="px-5 py-4"><p className="font-medium text-slate-900">{displayTitle(row.book)}</p><p className="mt-1 text-xs text-slate-500">No. klasifikasi: {row.book?.classification_number?.trim() || '—'} · Kode pengarang: {row.book?.author_code?.trim() || '—'}</p></td>
                    <td className="px-5 py-4 text-slate-500">{row.notes?.trim() || '—'}</td>
                    <td className="px-5 py-4"><ReturnBorrowingDialog borrowing={{ id: row.id, borrowerName: row.borrower?.name || 'Peminjam tidak diketahui', classification: row.book?.classification_number?.trim() || '—', authorCode: row.book?.author_code?.trim() || '—', title: displayTitle(row.book), borrowDate: row.borrow_date }} /></td>
                  </tr>
                ))}
                {data.rows.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">{data.search ? 'Tidak ada transaksi yang sesuai dengan pencarian.' : 'Belum ada transaksi yang perlu dikembalikan.'}</td></tr>}
              </tbody>
            </table>
          </div>
          {data.totalCount > 0 && <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Halaman {data.currentPage} dari {data.totalPages}</span><div className="flex gap-2">{data.currentPage > 1 && <Link href={pageHref(data.currentPage - 1, data.search)} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">Sebelumnya</Link>}{data.currentPage < data.totalPages && <Link href={pageHref(data.currentPage + 1, data.search)} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">Berikutnya</Link>}</div></div>}
        </section>
      </LiveSearchFilter>
    </div>
  )
}

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection()
  let data: ReturnsPage | null = null
  let dataError = ''
  try {
    data = await getReturnsPage(await searchParams)
  } catch (error) {
    dataError = error instanceof Error ? error.message : 'Gagal memuat data pengembalian.'
  }

  return <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row"><Sidebar active="returns" /><main className="min-w-0 flex-1"><header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-10"><div><p className="text-sm font-semibold text-emerald-800">Panel Admin</p><p className="mt-1 text-sm text-slate-500">Perpustakaan Desa Watuagung</p></div></header>{dataError ? <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 lg:m-10" role="alert">{dataError}</div> : data ? <ReturnsContent data={data} /> : null}</main></div>
}
