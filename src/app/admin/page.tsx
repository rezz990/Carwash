import Link from "next/link"

export default function AdminDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-2 text-lg">Selamat datang di panel admin POS Carwash.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/tarif" className="group block h-full">
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 hover:bg-white transition-all duration-300 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transform group-hover:scale-110 transition-all duration-500 text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">Kelola Tarif</h3>
            <p className="text-slate-500 flex-1 leading-relaxed">Atur harga untuk setiap jenis kendaraan dan sesuaikan persentase skema split bagi hasil dengan mudah.</p>
            
            <div className="mt-6 flex items-center text-indigo-600 text-sm font-semibold group-hover:gap-2 transition-all">
              <span>Buka menu</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 transition-transform group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </div>
        </Link>
        
        <Link href="/admin/users" className="group block h-full">
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 hover:bg-white transition-all duration-300 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transform group-hover:scale-110 transition-all duration-500 text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">Kelola User</h3>
            <p className="text-slate-500 flex-1 leading-relaxed">Kelola akses akun sistem, tambah kasir baru, atau atur peran administratif untuk tim Anda.</p>
            
            <div className="mt-6 flex items-center text-indigo-600 text-sm font-semibold group-hover:gap-2 transition-all">
              <span>Buka menu</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 transition-transform group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </div>
        </Link>
        
        <Link href="/admin/rekap" className="group block h-full">
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 hover:bg-white transition-all duration-300 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transform group-hover:scale-110 transition-all duration-500 text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </div>
            
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">Rekap Laporan</h3>
            <p className="text-slate-500 flex-1 leading-relaxed">Lihat detail pendapatan, pantau histori transaksi, dan export laporan data secara menyeluruh.</p>
            
            <div className="mt-6 flex items-center text-indigo-600 text-sm font-semibold group-hover:gap-2 transition-all">
              <span>Buka menu</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 transition-transform group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
