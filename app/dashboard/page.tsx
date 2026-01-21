import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) redirect("/");

  const db = getDb();
  
  // Kullanıcıyı veritabanından çek (veya oluştur)
  let dbUser = null;
  try {
    const [rows]: any = await db.query('SELECT * FROM users WHERE clerk_id = ?', [userId]);
    dbUser = rows[0];
    
    if (!dbUser) {
      await db.query(
        'INSERT INTO users (clerk_id, email, username) VALUES (?, ?, ?)',
        [userId, user.emailAddresses[0].emailAddress, user.firstName]
      );
      const [newRows]: any = await db.query('SELECT * FROM users WHERE clerk_id = ?', [userId]);
      dbUser = newRows[0];
    }
  } catch (err) {
    console.error("DB Hatası:", err);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Üst Başlık */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Komuta Merkezi 🚀
            </h1>
            <p className="text-slate-400">Hoş geldin, {dbUser?.title || "Gezgin"} {user.firstName}.</p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-500 uppercase">Bağlantı</div>
            <div className="text-green-400 font-bold flex items-center gap-1 justify-end">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online
            </div>
          </div>
        </div>

        {/* --- MODÜLLER (3 Sütunlu Izgara) --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-8">
           
           {/* 1. Market */}
           <Link href="/dashboard/market" className="group bg-gradient-to-br from-pink-900/40 to-slate-900 border border-slate-800 p-6 rounded-xl hover:border-pink-500/50 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-900/20">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🛍️</div>
              <div className="font-bold text-white">Mağaza</div>
              <div className="text-xs text-slate-400">Alışveriş Yap</div>
           </Link>

           {/* 2. Çanta */}
           <Link href="/dashboard/inventory" className="group bg-gradient-to-br from-blue-900/40 to-slate-900 border border-slate-800 p-6 rounded-xl hover:border-blue-500/50 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/20">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎒</div>
              <div className="font-bold text-white">Çanta</div>
              <div className="text-xs text-slate-400">Eşyaların</div>
           </Link>

           {/* 3. Finans */}
           <Link href="/dashboard/finance" className="group bg-gradient-to-br from-green-900/40 to-slate-900 border border-slate-800 p-6 rounded-xl hover:border-green-500/50 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-green-900/20">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📈</div>
              <div className="font-bold text-white">Finans</div>
              <div className="text-xs text-slate-400">Gelir Topla</div>
           </Link>

           {/* 4. Topluluk */}
           <Link href="/dashboard/community" className="group bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-slate-800 p-6 rounded-xl hover:border-indigo-500/50 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-900/20">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🌍</div>
              <div className="font-bold text-white">Topluluk</div>
              <div className="text-xs text-slate-400">Vatandaşları Gör</div>
           </Link>

           {/* 5. SİNEMA */}
           <Link href="/dashboard/cinema" className="group bg-gradient-to-br from-red-900/40 to-slate-900 border border-slate-800 p-6 rounded-xl hover:border-red-500/50 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-red-900/20">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎬</div>
              <div className="font-bold text-white">Sinema</div>
              <div className="text-xs text-slate-400">Film İzle</div>
           </Link>

           {/* 6. Ayarlar */}
           <Link href="/dashboard/settings" className="group bg-gradient-to-br from-purple-900/40 to-slate-900 border border-slate-800 p-6 rounded-xl hover:border-purple-500/50 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/20">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🧬</div>
              <div className="font-bold text-white">Kimlik</div>
              <div className="text-xs text-slate-400">Profil Ayarları</div>
           </Link>
        </div>

        {/* --- BİLGİ KARTLARI --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl rotate-12">🆔</div>
             <h2 className="text-xl font-bold text-white mb-4">Kimlik Kartı</h2>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-800">
                   <span className="text-slate-500">İsim</span>
                   <span className="text-white font-medium">{user.firstName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                   <span className="text-slate-500">Unvan</span>
                   <span className="text-cyan-400 font-medium">{dbUser?.title || "-"}</span>
                </div>
             </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl rotate-12">💰</div>
             <h2 className="text-xl font-bold text-white mb-2">Varlıklar</h2>
             <p className="text-slate-400 text-sm mb-6">Hesap Bakiyesi</p>
             <div className="flex items-end gap-2">
                <span className="text-5xl font-bold text-white tracking-tighter">{dbUser?.coins || 0}</span>
                <span className="text-xl text-yellow-400 font-bold mb-2">HP</span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}