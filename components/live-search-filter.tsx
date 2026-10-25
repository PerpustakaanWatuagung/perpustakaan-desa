'use client'

import { ReactNode, useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type LiveSearchFilterProps = {
  queryParam: string
  label: string
  value: string
  placeholder: string
  children: ReactNode
}

export function LiveSearchFilter({ queryParam, label, value, placeholder, children }: LiveSearchFilterProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(value)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const currentValue = searchParams.get(queryParam) ?? ''

      if (searchValue.trim() === currentValue) {
        return
      }

      const params = new URLSearchParams(searchParams.toString())
      const nextValue = searchValue.trim()

      if (nextValue) {
        params.set(queryParam, nextValue)
      } else {
        params.delete(queryParam)
      }

      params.delete('page')
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [pathname, queryParam, router, searchParams, searchValue])

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
        <label htmlFor={queryParam} className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
        <input
          id={queryParam}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        />
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
