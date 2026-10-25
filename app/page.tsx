import Link from 'next/link'
import { connection } from 'next/server'
import { Icon, type IconName } from '@/components/icons'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Sidebar } from '@/components/sidebar'

export const instant = false

type RecentLoan = {
  id: string
  borrower: string
  book: string
  classification: string
  date: string
  status: 'Dipinjam' | 'Dikembalikan'
  statusType: 'borrowed' | 'returned'
}

type DashboardData = {
  totalBooks: number
  availableBooks: number
  activeBorrowings: number
  incompleteBooks: number
  recentLoans: RecentLoan[]
}

type ActiveBook = {
  id: string
  classification_number: string | null
}

type ActiveBorrowing = {
  book_id: string
}

function formatDate(value: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'Tanggal tidak valid'
  }

  const [year, month, day] = value.split('-')
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const isLeapYear = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0)
  const maxDay = monthNumber === 2 && isLeapYear ? 29 : daysInMonth[monthNumber - 1]

  if (
    monthNumber < 1 ||
    monthNumber > 12 ||
    dayNumber < 1 ||
    dayNumber > maxDay
  ) {
    return 'Tanggal tidak valid'
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${day} ${monthNames[monthNumber - 1]} ${year}`
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
) {
  const pageSize = 500
  const rows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1)

    if (error) {
      throw new Error(`Gagal mengambil ${label}: ${error.message}`)
    }

    const page = data ?? []
    rows.push(...page)

    if (page.length < pageSize) {
      return rows
    }

    from += pageSize
  }
}

async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient()
  const [totalBooksResult, activeBorrowingsCountResult, recentBorrowingsResult] = await Promise.all([
    supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('borrowings')
      .select('id', { count: 'exact', head: true })
      .is('return_date', null),
    supabase
      .from('borrowings')
      .select('id, borrower_id, book_id, borrow_date, return_date, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (totalBooksResult.error) {
    throw new Error(`Gagal menghitung data buku: ${totalBooksResult.error.message}`)
  }

  if (totalBooksResult.count === null) {
    throw new Error('Gagal menghitung data buku: jumlah tidak tersedia.')
  }

  if (activeBorrowingsCountResult.error) {
    throw new Error(`Gagal menghitung peminjaman aktif: ${activeBorrowingsCountResult.error.message}`)
  }

  if (activeBorrowingsCountResult.count === null) {
    throw new Error('Gagal menghitung peminjaman aktif: jumlah tidak tersedia.')
  }

  if (recentBorrowingsResult.error) {
    throw new Error(`Gagal mengambil riwayat peminjaman: ${recentBorrowingsResult.error.message}`)
  }

  const activeBooks = await fetchAllRows(
    async (from, to) => supabase
      .from('books')
      .select('id, classification_number')
      .eq('is_active', true)
      .range(from, to),
    'seluruh buku aktif',
  ) as ActiveBook[]
  const activeBorrowings = await fetchAllRows(
    async (from, to) => supabase
      .from('borrowings')
      .select('book_id')
      .is('return_date', null)
      .range(from, to),
    'seluruh buku yang sedang dipinjam',
  ) as ActiveBorrowing[]
  const activeBookIds = new Set(activeBooks.map((book) => book.id))
  const borrowedBookIds = new Set(activeBorrowings.map((borrowing) => borrowing.book_id))
  const incompleteBooks = activeBooks.filter(
    (book) => book.classification_number === null || book.classification_number.trim() === '',
  ).length
  const recentBorrowings = recentBorrowingsResult.data
  const recentBookIds = [...new Set(recentBorrowings.map((borrowing) => borrowing.book_id))]
  const recentBorrowerIds = [...new Set(recentBorrowings.map((borrowing) => borrowing.borrower_id))]

  const [recentBooksResult, recentBorrowersResult] = await Promise.all([
    recentBookIds.length > 0
      ? supabase.from('books').select('id, title, title_initial, classification_number').in('id', recentBookIds)
      : Promise.resolve({ data: [], error: null }),
    recentBorrowerIds.length > 0
      ? supabase.from('borrowers').select('id, name').in('id', recentBorrowerIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (recentBooksResult.error) {
    throw new Error(`Gagal mengambil detail buku: ${recentBooksResult.error.message}`)
  }

  if (recentBorrowersResult.error) {
    throw new Error(`Gagal mengambil detail peminjam: ${recentBorrowersResult.error.message}`)
  }

  const booksById = new Map(recentBooksResult.data.map((book) => [book.id, book]))
  const borrowersById = new Map(recentBorrowersResult.data.map((borrower) => [borrower.id, borrower]))

  return {
    totalBooks: totalBooksResult.count,
    availableBooks: [...activeBookIds].filter((bookId) => !borrowedBookIds.has(bookId)).length,
    activeBorrowings: activeBorrowingsCountResult.count,
    incompleteBooks,
    recentLoans: recentBorrowings.map((borrowing) => {
      const book = booksById.get(borrowing.book_id)
      const borrower = borrowersById.get(borrowing.borrower_id)
      const title = book?.title?.trim() || book?.title_initial?.trim() || 'Judul belum diketahui'

      return {
        id: borrowing.id,
        borrower: borrower?.name || 'Peminjam tidak diketahui',
        book: title,
        classification: book?.classification_number?.trim() || '—',
        date: formatDate(borrowing.borrow_date),
        status: borrowing.return_date ? 'Dikembalikan' : 'Dipinjam',
        statusType: borrowing.return_date ? 'returned' : 'borrowed',
      }
    }),
  }
}

function StatCard({ icon, label, value, detail, tone = 'default' }: { icon: IconName; label: string; value: string; detail?: string; tone?: 'default' | 'positive' | 'warning' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${
          tone === 'positive' ? 'bg-emerald-50 text-emerald-700' : tone === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
        }`}>
          <Icon name={icon} className="h-5 w-5" />
        </div>
        {detail && <span className={`mt-1 text-xs font-medium ${tone === 'positive' ? 'text-emerald-700' : 'text-slate-500'}`}>{detail}</span>}
      </div>
      <p className="mt-5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}

export default async function Home() {
  await connection()

  let dashboardData: DashboardData | null = null
  let dataError = ''

  try {
    dashboardData = await getDashboardData()
  } catch (error) {
    dataError = error instanceof Error ? error.message : 'Gagal memuat data Dashboard.'
  }

  const availablePercentage = dashboardData && dashboardData.totalBooks > 0
    ? `${((dashboardData.availableBooks / dashboardData.totalBooks) * 100).toFixed(1).replace('.', ',')}% tersedia`
    : 'Data tidak tersedia'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <Sidebar active="dashboard" />
      <main className="min-w-0 flex-1">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Ringkasan kondisi perpustakaan</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-900">AD</div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Admin</p>
              <p className="text-xs text-slate-500">Perangkat Desa</p>
            </div>
          </div>
        </header>

        <div className="space-y-8 px-6 py-7 lg:px-10 lg:py-8">
          {dataError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {dataError}
            </div>
          )}
          <section aria-label="Statistik perpustakaan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon="books" label="Total Buku" value={dashboardData ? dashboardData.totalBooks.toLocaleString('id-ID') : '—'} detail={dashboardData ? 'Buku aktif' : 'Data tidak tersedia'} />
            <StatCard icon="book" label="Buku Tersedia" value={dashboardData ? dashboardData.availableBooks.toLocaleString('id-ID') : '—'} detail={availablePercentage} tone="positive" />
            <StatCard icon="loan" label="Sedang Dipinjam" value={dashboardData ? dashboardData.activeBorrowings.toLocaleString('id-ID') : '—'} detail={dashboardData ? 'Transaksi aktif' : 'Data tidak tersedia'} />
            <StatCard icon="alert" label="Data Belum Lengkap" value={dashboardData ? dashboardData.incompleteBooks.toLocaleString('id-ID') : '—'} detail={dashboardData ? 'Perlu dilengkapi' : 'Data tidak tersedia'} tone="warning" />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Peminjaman Terbaru</h2>
                  <p className="mt-1 text-sm text-slate-500">Aktivitas transaksi perpustakaan terbaru</p>
                </div>
                <Link href="#" className="flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:text-emerald-950">
                  Lihat Semua Riwayat <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Nama Peminjam</th>
                      <th className="px-5 py-3 font-semibold">Buku</th>
                      <th className="px-5 py-3 font-semibold">No. Klasifikasi</th>
                      <th className="px-5 py-3 font-semibold">Tanggal Pinjam</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboardData?.recentLoans.map((loan) => (
                      <tr key={loan.id} className="text-slate-700">
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">{loan.borrower}</td>
                        <td className="px-5 py-4">{loan.book}</td>
                        <td className="px-5 py-4 text-slate-500">{loan.classification}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-500">{loan.date}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            loan.statusType === 'returned' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {dashboardData && dashboardData.recentLoans.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center">
                          <p className="font-medium text-slate-700">Belum ada transaksi peminjaman</p>
                          <p className="mt-1 text-sm text-slate-500">Transaksi terbaru akan muncul di sini.</p>
                        </td>
                      </tr>
                    )}
                    {dataError && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-red-700">
                          Data transaksi tidak dapat ditampilkan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
              <h2 className="font-semibold text-slate-900">Aksi Cepat</h2>
              <p className="mt-1 text-sm text-slate-500">Kelola aktivitas harian</p>
              <div className="mt-5 space-y-3">
                <Link href="#" className="flex items-center justify-center gap-2 rounded-md bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-950">
                  <Icon name="plus" className="h-4 w-4" /> Tambah Buku
                </Link>
                <Link href="#" className="flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Icon name="loan" className="h-4 w-4" /> Catat Peminjaman
                </Link>
                <Link href="#" className="flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Icon name="return" className="h-4 w-4" /> Proses Pengembalian
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
