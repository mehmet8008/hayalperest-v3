import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// --- SERVER ACTION: ÖDÜL TOPLA ---
async function collectReward() {
  "use server";
  const { userId } = await auth();
  if (!userId) return;

  const db = getDb();
  
  // 1. Kullanıcıyı bul
  const [rows]: any = await db.query('SELECT last_reward_at, coins FROM users WHERE clerk_id = ?', [userId]);
  const user = rows[0];

  // 2. Zaman kontrolü (24 Saat)
  const now = new Date();
  const lastReward = user.last_reward_at ? new Date(user.last_reward_at) : null;
  
  // Eğer daha önce almışsa ve 24 saat geçmemişse durdur (Test için bunu 1 dakikaya düşürebilirsin)
  // Şimdilik test kolay olsun diye "1 Dakika" sınır koyuyorum. 
  // Gerçek hayatta: 24 * 60 * 60 * 1000 olmalı.
  const cooldown = 60 * 1000; // 1 Dakika (Test Modu)
  
  if (lastReward && (now.getTime() - lastReward.getTime() < cooldown)) {
     return; // Henüz zamanı gelmemiş
  }

  // 3. Ödülü Ver (Örn: 150 HP)
  await db.query(
    'UPDATE users SET coins = coins + 150, last_reward_at = NOW() WHERE clerk_id = ?',
    [userId]
  );
  
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard"); // Üstteki bakiyeyi de güncelle
}

export default async function FinancePage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const db = getDb();
  const [rows]: any = await db.query('SELECT * FROM users WHERE clerk_id = ?', [userId]);
  const user = rows[0];

  // Zaman Hesaplaması
  const now = new Date();
  const lastReward = user.last_reward_at ? new Date(user.last_reward_at) : null;
  const cooldown = 60 * 1000; // 1 Dakika (Yukarıdaki ile aynı olmalı)
  
  // Ödül alınabilir mi?
  const isReady = !lastReward || (now.getTime() - lastReward.getTime() > cooldown);
  
  // Kalan süre hesaplama (Basit gösterim)
  let statusText = "ÖDÜL HAZIR";
  if (!isReady) {
      statusText = "SİSTEM SOĞUTULUYOR..."; // Bekleme süresi
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-md mx-auto text-center">
        
        {/* Navigasyon */}
        <div className="flex justify-between items-center mb-8">
            <Link href="/dashboard" className="p-3 bg-slate-900 rounded-xl border border-slate-700">⬅</Link>
            <h1 className="text-xl font-bold text-green-400">Finans Merkezi 📈</h1>
            <div className="w-10"></div> {/* Hizalama için boşluk */}
        </div>

        {/* Ana Bakiye Kartı */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-10 mb-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
            
            <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">TOPLAM VARLIK</p>
            <div className="text-6xl font-black text-white mb-2 tracking-tighter">
                {user.coins}
            </div>
            <div className="text-green-500 font-bold bg-green-900/20 inline-block px-3 py-1 rounded-full text-xs border border-green-900/50">
                HP COIN
            </div>
        </div>

        {/* Günlük Ödül Alanı */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="mb-4">
                <div className="text-4xl mb-2">💎</div>
                <h2 className="text-xl font-bold text-white">Siber Maaş</h2>
                <p className="text-slate-400 text-sm">Sisteme katkı payını topla.</p>
            </div>

            <form action={collectReward}>
                <button 
                    disabled={!isReady}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 shadow-lg 
                        ${isReady 
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-900/20 animate-pulse' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }
                    `}
                >
                    {isReady ? '💰 150 HP TOPLA' : `⏳ ${statusText}`}
                </button>
            </form>
            
            {!isReady && (
                <p className="text-[10px] text-slate-600 mt-3">
                    Güvenlik protokolü devrede. Bir sonraki işlem için bekle.
                </p>
            )}
        </div>

      </div>
    </div>
  );
}