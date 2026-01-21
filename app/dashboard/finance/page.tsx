import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// --- SERVER ACTION (PARA BASMA MAKİNESİ) ---
async function claimDailyIncome() {
  "use server";
  
  const { userId } = await auth();
  if (!userId) return;

  const db = getDb();

  // 1. Kullanıcıyı ve son çekim tarihini kontrol et
  const [rows]: any = await db.query('SELECT last_daily_claim FROM users WHERE clerk_id = ?', [userId]);
  const lastClaim = rows[0]?.last_daily_claim;

  const now = new Date();
  const claimAmount = 150; // Günlük Maaş Miktarı

  // Eğer daha önce çekmişse, 24 saat geçmiş mi bak
  if (lastClaim) {
    const lastDate = new Date(lastClaim);
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffHours = diffTime / (1000 * 60 * 60);

    if (diffHours < 24) {
      // 24 saat dolmamış, işlem yapma
      return;
    }
  }

  // 2. Parayı Ver ve Tarihi Güncelle
  await db.query(
    'UPDATE users SET coins = coins + ?, last_daily_claim = NOW() WHERE clerk_id = ?', 
    [claimAmount, userId]
  );

  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
}

export default async function FinancePage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const db = getDb();
  
  // Verileri Çek
  const [rows]: any = await db.query('SELECT * FROM users WHERE clerk_id = ?', [userId]);
  const user = rows[0];

  // Zaman Hesabı
  let canClaim = true;
  let nextClaimText = "Şu an talep edilebilir.";
  
  if (user.last_daily_claim) {
    const lastDate = new Date(user.last_daily_claim);
    const now = new Date();
    // 24 saat ekle
    const nextClaimDate = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
    
    if (now < nextClaimDate) {
      canClaim = false;
      // Kalan saati hesapla (Basit gösterim)
      const diffMs = nextClaimDate.getTime() - now.getTime();
      const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
      const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
      nextClaimText = `Sonraki işlem: ${diffHrs} saat ${diffMins} dakika sonra`;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigasyon */}
        <div className="flex items-center gap-4 mb-8">
           <Link href="/dashboard" className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 transition-colors">⬅</Link>
           <div>
             <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
               Finans Merkezi 📈
             </h1>
             <p className="text-slate-400">Varlık Yönetimi ve Gelir Akışı</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* SOL TARAF: Ana Kasa */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/10 blur-[60px] rounded-full pointer-events-none"></div>
                
                <h2 className="text-xl font-bold text-white mb-2">Toplam Varlık</h2>
                <div className="flex items-baseline gap-2 mb-8">
                    <span className="text-5xl font-bold text-white">{user.coins}</span>
                    <span className="text-xl text-green-400 font-bold">HP</span>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between text-sm border-b border-slate-800 pb-2">
                        <span className="text-slate-500">Gelir Türü</span>
                        <span className="text-white">Vatandaşlık Temettüsü</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-slate-800 pb-2">
                        <span className="text-slate-500">Statü</span>
                        <span className="text-cyan-400">{user.title || "Standart"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Son İşlem</span>
                        <span className="text-slate-400 text-xs">
                            {user.last_daily_claim ? new Date(user.last_daily_claim).toLocaleString('tr-TR') : "Hiç çekilmedi"}
                        </span>
                    </div>
                </div>
            </div>

            {/* SAĞ TARAF: İşlem Paneli */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white mb-4">Günlük Fon Akışı</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        HayalPerest evrenindeki aktif vatandaşlık maaşın hazır. Bu fon her 24 saatte bir yenilenir.
                    </p>
                    
                    <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 mb-6">
                        <div className="text-xs text-slate-500 mb-1">MİKTAR</div>
                        <div className="text-2xl font-bold text-green-400">+150.00 HP</div>
                    </div>
                </div>

                <form action={claimDailyIncome}>
                    {canClaim ? (
                        <button className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02]">
                            FONU HESABA AKTAR 💸
                        </button>
                    ) : (
                        <button disabled className="w-full py-4 bg-slate-800 border border-slate-700 text-slate-500 font-bold rounded-xl cursor-not-allowed flex flex-col items-center justify-center">
                            <span>İŞLEM KİLİTLİ 🔒</span>
                            <span className="text-xs font-normal mt-1 opacity-70">{nextClaimText}</span>
                        </button>
                    )}
                </form>
            </div>
        </div>

      </div>
    </div>
  );
}