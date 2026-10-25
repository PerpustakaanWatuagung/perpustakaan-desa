import Link from 'next/link'
import { connection } from 'next/server'
import { AddBorrowerDialog } from '@/components/add-borrower-dialog'
import { DeactivateBorrowerDialog } from '@/components/deactivate-borrower-dialog'
import { EditBorrowerDialog } from '@/components/edit-borrower-dialog'
import { LiveSearchFilter } from '@/components/live-search-filter'
import { Sidebar } from '@/components/sidebar'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const instant = false

const pageSize = 20

type SearchParams = {
  name?: string
  page?: string
}

type Borrower = {
  id: string
  name: string
  address: string | null
}

type BorrowerPage = {
  borrowers: Borrower[]
  totalCount: number
  currentPage: number
  totalPages: number
  name: string
}

async function getBorrowerPage(searchParams: SearchParams): Promise<BorrowerPage> {
  const supabase = await createSupabaseServerClient()
  const name = searchParams.name?.trim() ?? ''
  const parsedPage = Number.parseInt(searchParams.page ?? '1', 10)
  const requestedPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const fetchBorrowers = (page: number) => {
    let query = supabase
      .from('borrowers')
      .select('id, name, address', { count: 'exact' })
      .eq('is_active', true)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (name) {
      query = query.ilike('name', `%${name}%`)
    }

    return query
  }

  let borrowersResult = await fetchBorrowers(requestedPage)

  if (borrowersResult.error) {
    throw new Error(`Gagal mengambil data peminjam: ${borrowersResult.error.message}`)
  }

  const totalCount = borrowersResult.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1

  if (currentPage !== requestedPage) {
    borrowersResult = await fetchBorrowers(currentPage)

    if (borrowersResult.error) {
      throw new Error(`Gagal mengambil data peminjam: ${borrowersResult.error.message}`)
    }
  }

  return {
    borrowers: borrowersResult.data ?? [],
    totalCount,
    currentPage,
    totalPages,
    name,
  }
}

function pageHref(page: number, name: string) {
  const params = new URLSearchParams()
  if (name) params.set('name', name)
  params.set('page', String(page))
  return `/borrowers?${params.toString()}`
}

function BorrowersContent({ data }: { data: BorrowerPage }) {
  return (
    <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Peminjam</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola data peminjam perpustakaan.</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-500">{data.totalCount.toLocaleString('id-ID')} peminjam ditemukan</p>
          <AddBorrowerDialog />
        </div>
      </div>

      <LiveSearchFilter
        queryParam="name"
        label="Nama Peminjam"
        value={data.name}
        placeholder="Cari nama peminjam"
      >
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Nama Peminjam</th>
                <th className="px-5 py-3 font-semibold">Alamat</th>
                <th className="px-5 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.borrowers.map((borrower) => (
                <tr key={borrower.id} className="text-slate-700">
                  <td className="px-5 py-4 font-medium text-slate-900">{borrower.name}</td>
                  <td className="px-5 py-4 text-slate-500">{borrower.address?.trim() || '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <EditBorrowerDialog borrower={borrower} />
                      <DeactivateBorrowerDialog borrower={borrower} />
                    </div>
                  </td>
                </tr>
              ))}
              {data.borrowers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-sm text-slate-500">
                    {data.name ? 'Tidak ada peminjam yang sesuai dengan pencarian.' : 'Belum ada data peminjam.'}
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
              {data.currentPage > 1 && <Link href={pageHref(data.currentPage - 1, data.name)} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">Sebelumnya</Link>}
              {data.currentPage < data.totalPages && <Link href={pageHref(data.currentPage + 1, data.name)} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">Berikutnya</Link>}
            </div>
          </div>
        )}
      </section>
      </LiveSearchFilter>
    </div>
  )
}

export default async function BorrowersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection()

  let data: BorrowerPage | null = null
  let dataError = ''

  try {
    data = await getBorrowerPage(await searchParams)
  } catch (error) {
    dataError = error instanceof Error ? error.message : 'Gagal memuat data peminjam.'
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <Sidebar active="borrowers" />
      <main className="min-w-0 flex-1">
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Panel Admin</p>
            <p className="mt-1 text-sm text-slate-500">Perpustakaan Desa Watuagung</p>
          </div>
        </header>
        {dataError ? (
          <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 lg:m-10" role="alert">{dataError}</div>
        ) : data ? (
          <BorrowersContent data={data} />
        ) : null}
      </main>
    </div>
  )
}
