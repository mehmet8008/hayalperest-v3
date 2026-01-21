import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs"; // <--- YENİ EKLENTİ

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) redirect("/");

  const db = getDb();
  
  // ... (üst kısımlar aynı)

  // Kullanıcıyı veritabanından çek (veya oluştur)
  let dbUser = null;
  try {
    const [rows]: any = await db.query('SELECT * FROM users WHERE clerk_id = ?', [userId]);
    dbUser = rows[0];
    
    // Clerk'teki güncel resmi al
    const currentImage = user.imageUrl;

    if (!dbUser) {
      // Yeni kayıt
      await db.query(
        'INSERT INTO users (clerk_id, email, username, image_url) VALUES (?, ?, ?, ?)',
        [userId, user.emailAddresses[0].emailAddress, user.firstName, currentImage]
      );
      // Tekrar çek
      const [newRows]: any = await db.query('SELECT * FROM users WHERE clerk_id = ?', [userId]);
      dbUser = newRows[0];
    } else {
      // MEVCUT KULLANICI: Eğer resmi değişmişse veya yoksa güncelle
      // (Her girişte güncelliyoruz ki Clerk'te resim değiştirirse buraya da yansısın)
      if (dbUser.image_url !== currentImage) {
         await db.query('UPDATE users SET image_url = ? WHERE clerk_id = ?', [currentImage, userId]);
         dbUser.image_url = currentImage; // Yerel değişkeni de güncelle
      }
    }
  } catch (err) {
    console.error("DB Hatası:", err);
  }

  // ... (alt kısımlar aynı)

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* ÜST BAŞLIK & PROFİL YÖNETİMİ */}
        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              Komuta Merkezi 🚀
            </h1>
            
            {/* YENİ EKLENEN KISIM: Ana Sayfaya Dönüş Linki */}
            <Link href="/" className="text-xs text-cyan-400 hover:text-white hover:underline mt-1 flex items-center gap-1 transition-colors w-fit">
               <span>🏠</span> Ana Sayfaya Git
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Online Işığı */}
            <div className="hidden md:flex flex-col items-end">
                <div className="text-[10px] text-slate-500 uppercase">SİSTEM</div>
                <div className="text-green-400 text-xs font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> ONLINE
                </div>
            </div>

            {/* ÇIKIŞ VE PROFİL BUTONU */}
            <div className="bg-slate-900 p-1 rounded-full border border-slate-700">
                <UserButton afterSignOutUrl="/"/>
            </div>
          </div>
        </div>

        {/* --- MODÜLLER (3 Sütunlu Izgara) --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
           
           {/* 1. Market */}
           <Link href="/dashboard/market" className="group bg-gradient-to-br from-pink-900/40 to-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl hover:border-pink-500/50 transition-all active:scale-95">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🛍️</div>
              <div className="font-bold text-white text-sm md:text-base">Mağaza</div>
              <div className="text-xs text-slate-400">Alışveriş Yap</div>
           </Link>

           {/* 2. Çanta */}
           <Link href="/dashboard/inventory" className="group bg-gradient-to-br from-blue-900/40 to-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl hover:border-blue-500/50 transition-all active:scale-95">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎒</div>
              <div className="font-bold text-white text-sm md:text-base">Çanta</div>
              <div className="text-xs text-slate-400">Eşyaların</div>
           </Link>

           {/* 3. Finans */}
           <Link href="/dashboard/finance" className="group bg-gradient-to-br from-green-900/40 to-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl hover:border-green-500/50 transition-all active:scale-95">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📈</div>
              <div className="font-bold text-white text-sm md:text-base">Finans</div>
              <div className="text-xs text-slate-400">Gelir Topla</div>
           </Link>

           {/* 4. Topluluk */}
           <Link href="/dashboard/community" className="group bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl hover:border-indigo-500/50 transition-all active:scale-95">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🌍</div>
              <div className="font-bold text-white text-sm md:text-base">Topluluk</div>
              <div className="text-xs text-slate-400">Vatandaşlar</div>
           </Link>

           {/* 5. SİNEMA */}
           <Link href="/dashboard/cinema" className="group bg-gradient-to-br from-red-900/40 to-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl hover:border-red-500/50 transition-all active:scale-95">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎬</div>
              <div className="font-bold text-white text-sm md:text-base">Sinema</div>
              <div className="text-xs text-slate-400">İzle</div>
           </Link>

           {/* 6. Ayarlar */}
           <Link href="/dashboard/settings" className="group bg-gradient-to-br from-purple-900/40 to-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl hover:border-purple-500/50 transition-all active:scale-95">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🧬</div>
              <div className="font-bold text-white text-sm md:text-base">Kimlik</div>
              <div className="text-xs text-slate-400">Ayarlar</div>
           </Link>
        </div>

        {/* --- YÖNETİCİ PANELİ (GİZLİ GEÇİT) --- */}
        {/* Sadece admin girebilir ama butonu buraya koyalım ki kolay olsun */}
        <div className="text-center mt-10">
           <Link href="/admin" className="inline-block text-xs text-slate-600 hover:text-red-500 transition-colors border border-slate-800 px-3 py-1 rounded">
             🔧 Yönetici Girişi
           </Link>
        </div>

      </div>
    </div>
  );
}