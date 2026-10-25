import Link from 'next/link'
import { connection } from 'next/server'
import { LiveSearchFilter } from '@/components/live-search-filter'
import { Sidebar } from '@/components/sidebar'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const instant = false

const pageSize = 20

type SearchParams = { search?: string; page?: string }

type Book = {
  id: string
  classification_number: string | null
  author_code: string | null
  title_initial: string | null
  title: string | null
}

type Borrower = {
  id: string
  name: string
}

type Borrowing = {
  id: string
  borrower_id: string
  book_id: string
  borrow_date: string
  return_date: string | null
  notes: string | null
  created_at: string
  borrower: Borrower
  book: Book
}

type BorrowingHistoryPage = {
  borrowings: Borrowing[]
  totalCount: number
  currentPage: number
  totalPages: number
  search: string
}

function formatDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value ? 'Tanggal tidak valid' : '—'
  }

  const [year, month, day] = value.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const monthNumber = Number(month)
  const dayNumber = Number(day)

  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) {
    return 'Tanggal tidak valid'
  }

  return `${day} ${monthNames[monthNumber - 1]} ${year}`
}

function displayTitle(book: Book) {
  return book.title?.trim() || book.title_initial?.trim() || 'Judul belum diketahui'
}

function escapeIlike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&')
}

function pageHref(page: number, search: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('page', String(page))
  return `/borrowing-history?${params.toString()}`
}

async function getMatchingBookIds(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, pattern: string) {
  const ids: string[] = []
  const lookupPageSize = 500
  let page = 0

  while (true) {
    const result = await supabase
      .from('books')
      .select('id')
      .or(`classification_number.ilike.${pattern},author_code.ilike.${pattern},title_initial.ilike.${pattern},title.ilike.${pattern}`)
      .range(page * lookupPageSize, (page + 1) * lookupPageSize - 1)

    if (result.error) {
      throw new Error(`Gagal mencari buku dalam riwayat: ${result.error.message}`)
    }

    ids.push(...(result.data ?? []).map((book) => String(book.id)))
    if (!result.data || result.data.length < lookupPageSize) return ids
    page += 1
  }
}

async function getMatchingBorrowerIds(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, pattern: string) {
  const ids: string[] = []
  const lookupPageSize = 500
  let page = 0

  while (true) {
    const result = await supabase
      .from('borrowers')
      .select('id')
      .ilike('name', pattern)
      .range(page * lookupPageSize, (page + 1) * lookupPageSize - 1)

    if (result.error) {
      throw new Error(`Gagal mencari peminjam dalam riwayat: ${result.error.message}`)
    }

    ids.push(...(result.data ?? []).map((borrower) => String(borrower.id)))
    if (!result.data || result.data.length < lookupPageSize) return ids
    page += 1
  }
}

async function getBorrowingHistoryPage(searchParams: SearchParams): Promise<BorrowingHistoryPage> {
  const supabase = await createSupabaseServerClient()
  const search = searchParams.search?.trim() ?? ''
  const parsedPage = Number.parseInt(searchParams.page ?? '1', 10)
  const requestedPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1

  let matchingBookIds: string[] = []
  let matchingBorrowerIds: string[] = []

  if (search) {
    const pattern = `%${escapeIlike(search)}%`
    const [bookIds, borrowerIds] = await Promise.all([
      getMatchingBookIds(supabase, pattern),
      getMatchingBorrowerIds(supabase, pattern),
    ])
    matchingBookIds = bookIds
    matchingBorrowerIds = borrowerIds

    if (matchingBookIds.length === 0 && matchingBorrowerIds.length === 0) {
      return { borrowings: [], totalCount: 0, currentPage: 1, totalPages: 1, search }
    }
  }

  let borrowingsQuery = supabase
    .from('borrowings')
    .select('id, borrower_id, book_id, borrow_date, return_date, notes, created_at', { count: 'exact' })
    .order('borrow_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range((requestedPage - 1) * pageSize, requestedPage * pageSize - 1)

  if (search) {
    const filters = []
    if (matchingBookIds.length > 0) filters.push(`book_id.in.(${matchingBookIds.join(',')})`)
    if (matchingBorrowerIds.length > 0) filters.push(`borrower_id.in.(${matchingBorrowerIds.join(',')})`)
    borrowingsQuery = borrowingsQuery.or(filters.join(','))
  }

  const borrowingsResult = await borrowingsQuery

  if (borrowingsResult.error) {
    throw new Error(`Gagal mengambil riwayat peminjaman: ${borrowingsResult.error.message}`)
  }

  const totalCount = borrowingsResult.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1

  if (totalCount > 0 && currentPage !== requestedPage) {
    let correctedQuery = supabase
      .from('borrowings')
      .select('id, borrower_id, book_id, borrow_date, return_date, notes, created_at', { count: 'exact' })
      .order('borrow_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

    if (search) {
      correctedQuery = correctedQuery.or([
        matchingBookIds.length > 0 ? `book_id.in.(${matchingBookIds.join(',')})` : '',
        matchingBorrowerIds.length > 0 ? `borrower_id.in.(${matchingBorrowerIds.join(',')})` : '',
      ].filter(Boolean).join(','))
    }

    const correctedResult = await correctedQuery

    if (correctedResult.error) {
      throw new Error(`Gagal mengambil halaman riwayat peminjaman: ${correctedResult.error.message}`)
    }

    borrowingsResult.data = correctedResult.data
  }

  const rawBorrowings = borrowingsResult.data ?? []
  const bookIds = [...new Set(rawBorrowings.map((borrowing) => String(borrowing.book_id)))]
  const borrowerIds = [...new Set(rawBorrowings.map((borrowing) => String(borrowing.borrower_id)))]

  if (rawBorrowings.length === 0) {
    return { borrowings: [], totalCount, currentPage, totalPages, search }
  }

  const [booksResult, borrowersResult] = await Promise.all([
    supabase.from('books').select('id, classification_number, author_code, title_initial, title').in('id', bookIds),
    supabase.from('borrowers').select('id, name').in('id', borrowerIds),
  ])

  if (booksResult.error) {
    throw new Error(`Gagal mengambil detail buku riwayat: ${booksResult.error.message}`)
  }

  if (borrowersResult.error) {
    throw new Error(`Gagal mengambil detail peminjam riwayat: ${borrowersResult.error.message}`)
  }

  const booksById = new Map((booksResult.data ?? []).map((book) => [String(book.id), { ...book, id: String(book.id) }]))
  const borrowersById = new Map((borrowersResult.data ?? []).map((borrower) => [String(borrower.id), { ...borrower, id: String(borrower.id) }]))
  const missingBookIds = bookIds.filter((id) => !booksById.has(id))
  const missingBorrowerIds = borrowerIds.filter((id) => !borrowersById.has(id))

  if (missingBookIds.length > 0) {
    throw new Error(`Relasi buku tidak ditemukan untuk ${missingBookIds.length} transaksi riwayat.`)
  }

  if (missingBorrowerIds.length > 0) {
    throw new Error(`Relasi peminjam tidak ditemukan untuk ${missingBorrowerIds.length} transaksi riwayat.`)
  }

  return {
    borrowings: rawBorrowings.map((borrowing) => ({
      ...borrowing,
      id: String(borrowing.id),
      borrower_id: String(borrowing.borrower_id),
      book_id: String(borrowing.book_id),
      borrower: borrowersById.get(String(borrowing.borrower_id))!,
      book: booksById.get(String(borrowing.book_id))!,
    })),
    totalCount,
    currentPage,
    totalPages,
    search,
  }
}

function BorrowingHistoryContent({ data }: { data: BorrowingHistoryPage }) {
  return (
    <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Riwayat Peminjaman</h1>
          <p className="mt-1 text-sm text-slate-500">Daftar seluruh transaksi peminjaman buku.</p>
        </div>
        <p className="text-sm text-slate-500">{data.totalCount.toLocaleString('id-ID')} transaksi ditemukan</p>
      </div>

      <LiveSearchFilter queryParam="search" label="Cari Riwayat Peminjaman" value={data.search} placeholder="Cari nama, klasifikasi, kode pengarang, atau judul">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tanggal Peminjaman</th>
                  <th className="px-5 py-3 font-semibold">Tanggal Pengembalian</th>
                  <th className="px-5 py-3 font-semibold">Nama Anggota</th>
                  <th className="px-5 py-3 font-semibold">Buku</th>
                  <th className="px-5 py-3 font-semibold">No. Klasifikasi</th>
                  <th className="px-5 py-3 font-semibold">Kode Pengarang</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.borrowings.map((borrowing) => {
                  const returned = borrowing.return_date !== null
                  return (
                    <tr key={borrowing.id} className="text-slate-700">
                      <td className="whitespace-nowrap px-5 py-4">{formatDate(borrowing.borrow_date)}</td>
                      <td className="whitespace-nowrap px-5 py-4">{formatDate(borrowing.return_date)}</td>
                      <td className="px-5 py-4 font-medium text-slate-900">{borrowing.borrower.name}</td>
                      <td className="px-5 py-4 font-medium text-slate-900">{displayTitle(borrowing.book)}</td>
                      <td className="whitespace-nowrap px-5 py-4">{borrowing.book.classification_number?.trim() || '—'}</td>
                      <td className="whitespace-nowrap px-5 py-4">{borrowing.book.author_code?.trim() || '—'}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${returned ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'}`}>
                          {returned ? 'Dikembalikan' : 'Dipinjam'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {data.borrowings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                      {data.search ? 'Tidak ada transaksi yang sesuai dengan pencarian.' : 'Belum ada riwayat peminjaman.'}
                    </td>
                  </tr>
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

export default async function BorrowingHistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection()
  let data: BorrowingHistoryPage | null = null
  let dataError = ''

  try {
    data = await getBorrowingHistoryPage(await searchParams)
  } catch (error) {
    dataError = error instanceof Error ? error.message : 'Gagal memuat riwayat peminjaman.'
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <Sidebar active="borrowing-history" />
      <main className="min-w-0 flex-1">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div><p className="text-sm font-semibold text-emerald-800">Panel Admin</p><p className="mt-1 text-sm text-slate-500">Perpustakaan Desa Watuagung</p></div>
        </header>
        {dataError ? <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 lg:m-10" role="alert">{dataError}</div> : data ? <BorrowingHistoryContent data={data} /> : null}
      </main>
    </div>
  )
}
