export default function BorrowingsLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <div className="w-full shrink-0 border-b border-slate-200 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="h-24 animate-pulse bg-slate-100" />
      </div>
      <main className="min-w-0 flex-1">
        <header className="border-b border-slate-200 bg-white px-6 py-6 lg:px-10"><div className="h-4 w-48 animate-pulse rounded bg-slate-200" /></header>
        <div className="space-y-6 px-6 py-7 lg:px-10 lg:py-8">
          <div className="h-8 w-52 animate-pulse rounded bg-slate-200" />
          <div className="h-20 animate-pulse rounded-lg bg-white" />
          <div className="h-64 animate-pulse rounded-lg bg-white" />
        </div>
      </main>
    </div>
  )
}
