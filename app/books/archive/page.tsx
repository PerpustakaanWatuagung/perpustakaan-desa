import Link from 'next/link'
import { connection } from 'next/server'
import { ActivateBookDialog } from '@/components/activate-book-dialog'
import { LiveSearchFilter } from '@/components/live-search-filter'
import { Sidebar } from '@/components/sidebar'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const instant = false

const pageSize = 20

type SearchParams = {
  classification?: string
  page?: string
}

type Book = {
  id: string
  classification_number: string | null
  author_code: string | null
  title_initial: string | null
  title: string | null
  category_id: string | null
}

type Category = {
  id: string
  name: string
}

type ArchivePage = {
  books: Book[]
  categories: Category[]
  totalCount: number
  currentPage: number
  totalPages: number
  classification: string
}

async function getArchivePage(searchParams: SearchParams): Promise<ArchivePage> {
  const supabase = await createSupabaseServerClient()
  const classification = searchParams.classification?.trim() ?? ''
  const parsedPage = Number.parseInt(searchParams.page ?? '1', 10)
  const requestedPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const fetchBooks = (page: number) => {
    let query = supabase
      .from('books')
      .select('id, classification_number, author_code, title_initial, title, category_id', { count: 'exact' })
      .eq('is_active', false)
      .order('classification_number', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (classification) {
      query = query.ilike('classification_number', `%${classification}%`)
    }

    return query
  }

  const [initialBooksResult, categoriesResult] = await Promise.all([
    fetchBooks(requestedPage),
    supabase.from('categories').select('id, name').order('name', { ascending: true }),
  ])
  let booksResult = initialBooksResult

  if (booksResult.error) {
    throw new Error(`Gagal mengambil arsip buku: ${booksResult.error.message}`)
  }

  if (categoriesResult.error) {
    throw new Error(`Gagal mengambil kategori: ${categoriesResult.error.message}`)
  }

  const totalCount = booksResult.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1

  if (currentPage !== requestedPage) {
    booksResult = await fetchBooks(currentPage)

    if (booksResult.error) {
      throw new Error(`Gagal mengambil arsip buku: ${booksResult.error.message}`)
    }
  }

  return {
    books: booksResult.data ?? [],
    categories: categoriesResult.data ?? [],
    totalCount,
    currentPage,
    totalPages,
    classification,
  }
}

function pageHref(page: number, classification: string) {
  const params = new URLSearchParams()
  if (classification) params.set('classification', classification)
  params.set('page', String(page))
  return `/books/archive?${params.toString()}`
}

function displayTitle(book: Book) {
  return book.title?.trim() || book.title_initial?.trim() || 'Judul belum diketahui'
}

function ArchiveContent({ data }: { data: ArchivePage }) {
  return (
    <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Arsip Buku</h1>
          <p className="mt-1 text-sm text-slate-500">Daftar buku yang sudah dinonaktifkan dari koleksi aktif.</p>
        </div>
        <p className="text-sm text-slate-500">{data.totalCount.toLocaleString('id-ID')} buku ditemukan</p>
      </div>

      <LiveSearchFilter
        queryParam="classification"
        label="No. Klasifikasi"
        value={data.classification}
        placeholder="Cari nomor klasifikasi"
      >
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">No. Klasifikasi</th>
                <th className="px-5 py-3 font-semibold">Kode Pengarang</th>
                <th className="px-5 py-3 font-semibold">Judul</th>
                <th className="px-5 py-3 font-semibold">Kategori</th>
                <th className="px-5 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.books.map((book) => (
                <tr key={book.id} className="text-slate-700">
                  <td className="whitespace-nowrap px-5 py-4">{book.classification_number?.trim() || '—'}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{book.author_code?.trim() || '—'}</td>
                  <td className="px-5 py-4 font-medium text-slate-900">{displayTitle(book)}</td>
                  <td className="px-5 py-4 text-slate-500">{data.categories.find((category) => category.id === book.category_id)?.name || 'Kategori tidak diketahui'}</td>
                  <td className="px-5 py-4"><ActivateBookDialog book={book} /></td>
                </tr>
              ))}
              {data.books.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                    {data.classification ? 'Tidak ada buku arsip yang sesuai dengan nomor klasifikasi.' : 'Belum ada buku yang diarsipkan.'}
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
              {data.currentPage > 1 && <Link href={pageHref(data.currentPage - 1, data.classification)} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">Sebelumnya</Link>}
              {data.currentPage < data.totalPages && <Link href={pageHref(data.currentPage + 1, data.classification)} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">Berikutnya</Link>}
            </div>
          </div>
        )}
      </section>
      </LiveSearchFilter>
    </div>
  )
}

export default async function ArchiveBooksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection()

  let data: ArchivePage | null = null
  let dataError = ''

  try {
    data = await getArchivePage(await searchParams)
  } catch (error) {
    dataError = error instanceof Error ? error.message : 'Gagal memuat arsip buku.'
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <Sidebar active="archive" />
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
          <ArchiveContent data={data} />
        ) : null}
      </main>
    </div>
  )
}
