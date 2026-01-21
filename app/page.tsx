import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      
      {/* ARKA PLAN EFEKTLERİ */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px]"></div>
      </div>

      {/* NAVBAR */}
      <nav className="relative z-10 max-w-7xl mx-auto p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-3xl">♾️</span>
          <span className="text-2xl font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
            HAYALPEREST
          </span>
        </div>
        
        <div className="flex gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-6 py-2 border border-slate-700 hover:border-cyan-500 rounded-lg transition-all text-slate-300 hover:text-cyan-400">
                Giriş Yap
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <Link href="/dashboard" className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-cyan-50 transition-all flex items-center gap-2">
              Komuta Merkezine Dön 🚀
            </Link>
          </SignedIn>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        
        <div className="inline-block px-4 py-1 border border-slate-700 rounded-full bg-slate-900/50 backdrop-blur-md mb-8 animate-pulse">
          <span className="text-xs font-mono text-cyan-400">● SİSTEM ONLİNE V1.0</span>
        </div>

        <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tight leading-tight">
          DİJİTAL EVRENİN <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
            YENİ SINIRI
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          Kendi dijital ikizini oluştur, ekonomiye katıl, sosyalleş ve geleceği bugünden yaşa.
        </p>

        <div className="flex flex-col md:flex-row gap-6">
           <SignedOut>
             <SignInButton mode="modal">
                <button className="px-10 py-4 bg-white text-black text-lg font-bold rounded-xl hover:scale-105 transition-transform">
                  EVRENE KATIL
                </button>
             </SignInButton>
           </SignedOut>
           <SignedIn>
             <Link href="/dashboard" className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 text-white text-lg font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(168,85,247,0.4)]">
                BAŞLAT
             </Link>
           </SignedIn>
        </div>
      </main>
      
    </div>
  );
}