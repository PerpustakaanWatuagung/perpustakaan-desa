import Link from 'next/link'
import { Icon, type IconName } from '@/components/icons'
import { LogoutButton } from '@/components/logout-button'

type SidebarProps = {
  active: 'dashboard' | 'books' | 'archive' | 'borrowers' | 'borrowers-archive' | 'borrowings' | 'returns' | 'borrowing-history'
}

const navigation: { key: SidebarProps['active'] | null; label: string; icon: IconName; href: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/' },
  { key: 'books', label: 'Data Buku', icon: 'books', href: '/books' },
  { key: 'archive', label: 'Arsip Buku', icon: 'books', href: '/books/archive' },
  { key: 'borrowers', label: 'Data Peminjam', icon: 'users', href: '/borrowers' },
  { key: 'borrowers-archive', label: 'Arsip Peminjam', icon: 'users', href: '/borrowers/archive' },
  { key: 'borrowings', label: 'Peminjaman', icon: 'loan', href: '/borrowings' },
  { key: 'returns', label: 'Pengembalian', icon: 'return', href: '/returns' },
  { key: 'borrowing-history', label: 'Riwayat Peminjaman', icon: 'history', href: '/borrowing-history' },
]

export function Sidebar({ active }: SidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900 text-white">
          <Icon name="book" className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-slate-900">Perpustakaan Desa</p>
          <p className="mt-1 text-xs text-slate-500">Watuagung</p>
        </div>
      </div>

      <div className="mx-6 mb-4 rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
        Panel Admin
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1 lg:overflow-visible" aria-label="Menu utama">
        {navigation.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex min-w-max items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              item.key === active
                ? 'bg-emerald-50 text-emerald-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon name={item.icon} className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex gap-1 border-t border-slate-100 px-3 py-4 lg:block lg:space-y-1">
        <LogoutButton />
      </div>
    </aside>
  )
}
