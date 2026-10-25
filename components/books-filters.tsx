'use client'

import { ReactNode, useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type BooksFiltersProps = {
  classification: string
  categoryId: string
  categories: { id: string; name: string }[]
  children: ReactNode
}

export function BooksFilters({ classification, categoryId, categories, children }: BooksFiltersProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [classificationValue, setClassificationValue] = useState(classification)
  const [selectedCategory, setSelectedCategory] = useState(categoryId)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const currentClassification = searchParams.get('classification') ?? ''

      if (classificationValue.trim() === currentClassification) {
        return
      }

      const params = new URLSearchParams(searchParams.toString())
      const value = classificationValue.trim()

      if (value) {
        params.set('classification', value)
      } else {
        params.delete('classification')
      }

      params.delete('page')
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [classificationValue, pathname, router, searchParams])

  function handleCategoryChange(value: string) {
    setSelectedCategory(value)
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set('category', value)
    } else {
      params.delete('category')
    }

    params.delete('page')
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <>
      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100 sm:grid-cols-[minmax(0,1fr)_minmax(0,280px)] sm:items-end">
        <div>
          <label htmlFor="classification" className="mb-2 block text-sm font-medium text-slate-700">No. Klasifikasi</label>
          <input
            id="classification"
            value={classificationValue}
            onChange={(event) => setClassificationValue(event.target.value)}
            placeholder="Cari nomor klasifikasi"
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div>
          <label htmlFor="category" className="mb-2 block text-sm font-medium text-slate-700">Kategori</label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(event) => handleCategoryChange(event.target.value)}
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">Semua kategori</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
      </div>

      <div className="relative">
        {isPending && (
          <div className="absolute right-4 top-4 z-10 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm" role="status">
            Memuat...
          </div>
        )}
        {children}
      </div>
    </>
  )
}
