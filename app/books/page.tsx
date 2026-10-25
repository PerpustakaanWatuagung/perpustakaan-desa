import Link from 'next/link'
import { connection } from 'next/server'
import { AddBookDialog } from '@/components/add-book-dialog'
import { BooksFilters } from '@/components/books-filters'
import { DeactivateBookDialog } from '@/components/deactivate-book-dialog'
import { EditBookDialog } from '@/components/edit-book-dialog'
import { Sidebar } from '@/components/sidebar'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const instant = false

const pageSize = 20

type SearchParams = {
  classification?: string
  category?: string
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

type BookPage = {
  books: Book[]
  activeBookIds: Set<string>
  categories: Category[]
  totalCount: number
  currentPage: number
  totalPages: number
  classification: string
  categoryId: string
}

async function getBookPage(searchParams: SearchParams): Promise<BookPage> {
  const supabase = await createSupabaseServerClient()
  const classification = searchParams.classification?.trim() ?? ''
  const categoryId = searchParams.category?.trim() ?? ''
  const parsedPage = Number.parseInt(searchParams.page ?? '1', 10)
  const requestedPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const fetchBooks = (page: number) => {
    let query = supabase
      .from('books')
      .select('id, classification_number, author_code, title_initial, title, category_id', { count: 'exact' })
      .eq('is_active', true)
      .order('classification_number', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (classification) {
      query = query.ilike('classification_number', `%${classification}%`)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    return query
  }

  const [initialBooksResult, categoriesResult] = await Promise.all([
    fetchBooks(requestedPage),
    supabase.from('categories').select('id, name').order('name', { ascending: true }),
  ])
  let booksResult = initialBooksResult

  if (booksResult.error) {
    throw new Error(`Gagal mengambil data buku: ${booksResult.error.message}`)
  }

  if (categoriesResult.error) {
    throw new Error(`Gagal mengambil kategori: ${categoriesResult.error.message}`)
  }

  const books = booksResult.data ?? []
  const totalCount = booksResult.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = totalCount > 0 ? Math.min(requestedPage, totalPages) : 1

  if (currentPage !== requestedPage) {
    booksResult = await fetchBooks(currentPage)

    if (booksResult.error) {
      throw new Error(`Gagal mengambil data buku: ${booksResult.error.message}`)
    }
  }

  const activeBookIds = new Set<string>()

  if (books.length > 0) {
    const activeBorrowingsResult = await supabase
      .from('borrowings')
      .select('book_id')
      .in('book_id', books.map((book) => book.id))
      .is('return_date', null)

    if (activeBorrowingsResult.error) {
      throw new Error(`Gagal memeriksa status peminjaman: ${activeBorrowingsResult.error.message}`)
    }

    for (const borrowing of activeBorrowingsResult.data ?? []) {
      activeBookIds.add(borrowing.book_id)
    }
  }

  return {
    books,
    activeBookIds,
    categories: categoriesResult.data ?? [],
    totalCount,
    currentPage,
    totalPages,
    classification,
    categoryId,
  }
}

function pageHref(page: number, classification: string, categoryId: string) {
  const params = new URLSearchParams()
  if (classification) params.set('classification', classification)
  if (categoryId) params.set('category', categoryId)
  params.set('page', String(page))
  return `/books?${params.toString()}`
}

function displayTitle(book: Book) {
  return book.title?.trim() || book.title_initial?.trim() || 'Judul belum diketahui'
}

function BooksContent({ data }: { data: BookPage }) {
  return (
    <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Buku</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola dan cari koleksi buku aktif perpustakaan.</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-500">{data.totalCount.toLocaleString('id-ID')} buku ditemukan</p>
          <AddBookDialog categories={data.categories} />
        </div>
      </div>

      <BooksFilters
        classification={data.classification}
        categoryId={data.categoryId}
        categories={data.categories}
      >
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">No. Klasifikasi</th>
                <th className="px-5 py-3 font-semibold">Kode Pengarang</th>
                <th className="px-5 py-3 font-semibold">Judul</th>
                <th className="px-5 py-3 font-semibold">Kategori</th>
                <th className="px-5 py-3 font-semibold">Status</th>
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
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${data.activeBookIds.has(book.id) ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {data.activeBookIds.has(book.id) ? 'Sedang Dipinjam' : 'Tersedia'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <EditBookDialog book={book} categories={data.categories} />
                      <DeactivateBookDialog book={book} />
                    </div>
                  </td>
                </tr>
              ))}
              {data.books.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">Tidak ada buku yang sesuai dengan pencarian.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data.totalCount > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Halaman {data.currentPage} dari {data.totalPages}</span>
            <div className="flex gap-2">
              {data.currentPage > 1 && <Link href={pageHref(data.currentPage - 1, data.classification, data.categoryId)} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">Sebelumnya</Link>}
              {data.currentPage < data.totalPages && <Link href={pageHref(data.currentPage + 1, data.classification, data.categoryId)} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">Berikutnya</Link>}
            </div>
          </div>
        )}
      </section>
      </BooksFilters>
    </div>
  )
}

export default async function BooksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection()

  let data: BookPage | null = null
  let dataError = ''

  try {
    data = await getBookPage(await searchParams)
  } catch (error) {
    dataError = error instanceof Error ? error.message : 'Gagal memuat data buku.'
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <Sidebar active="books" />
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
          <BooksContent data={data} />
        ) : null}
      </main>
    </div>
  )
}
