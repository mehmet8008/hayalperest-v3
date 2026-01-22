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
  
  const [rows]: any = await db.query('SELECT last_reward_at, coins FROM users WHERE clerk_id = ?', [userId]);
  const user = rows[0];

  const now = new Date();
  const lastReward = user.last_reward_at ? new Date(user.last_reward_at) : null;
  const cooldown = 60 * 1000; // 1 Dakika (Test Modu) - Normalde 24 saat
  
  if (lastReward && (now.getTime() - lastReward.getTime() < cooldown)) {
     return;
  }

  await db.query(
    'UPDATE users SET coins = coins + 150, last_reward_at = NOW() WHERE clerk_id = ?',
    [userId]
  );
  
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
}

export default async function FinancePage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const db = getDb();
  const [rows]: any = await db.query('SELECT * FROM users WHERE clerk_id = ?', [userId]);
  const user = rows[0];

  // --- YENİ EKLENEN KISIM: HARCAMA GEÇMİŞİNİ ÇEK ---
  // Inventory tablosunu Products ile birleştirip (JOIN) çekiyoruz
  const [transactions]: any = await db.query(`
    SELECT p.name, p.price, p.category, i.purchased_at 
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    WHERE i.clerk_id = ?
    ORDER BY i.purchased_at DESC
    LIMIT 10
  `, [userId]);

  // Zaman Hesaplaması (Maaş İçin)
  const now = new Date();
  const lastReward = user.last_reward_at ? new Date(user.last_reward_at) : null;
  const cooldown = 60 * 1000; 
  const isReady = !lastReward || (now.getTime() - lastReward.getTime() > cooldown);
  
  let statusText = "ÖDÜL HAZIR";
  if (!isReady) {
      statusText = "SİSTEM SOĞUTULUYOR...";
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigasyon */}
        <div className="flex justify-between items-center mb-8">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <span className="text-xl">⬅</span> Komuta Merkezine Dön
            </Link>
            <h1 className="text-2xl font-bold text-green-400 hidden md:block">Finans Merkezi 📈</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            
            {/* SOL TARAF: Bakiye ve Maaş */}
            <div className="space-y-6">
                {/* Bakiye Kartı */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl rotate-12 text-green-500">₺</div>
                    <p className="text-slate-400 text-xs uppercase tracking-widest mb-2 font-bold">TOPLAM VARLIK</p>
                    <div className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tighter">
                        {user.coins}
                    </div>
                    <div className="text-green-500 font-bold bg-green-900/20 inline-block px-3 py-1 rounded-full text-xs border border-green-900/50">
                        HP COIN
                    </div>
                </div>

                {/* Maaş Butonu */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="text-2xl">💎</div>
                        <div>
                            <h2 className="font-bold text-white">Siber Maaş</h2>
                            <p className="text-slate-400 text-xs">Günlük katkı payı.</p>
                        </div>
                    </div>

                    <form action={collectReward}>
                        <button 
                            disabled={!isReady}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all transform active:scale-95 shadow-lg 
                                ${isReady 
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-900/20 animate-pulse' 
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                }
                            `}
                        >
                            {isReady ? '💰 150 HP TOPLA' : `⏳ ${statusText}`}
                        </button>
                    </form>
                </div>
            </div>

            {/* SAĞ TARAF: Harcama Geçmişi (YENİ) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    🧾 Son İşlemler (Ekstre)
                </h3>

                {transactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 italic text-sm border border-dashed border-slate-800 rounded-xl">
                        Henüz bir harcama yapmadın.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((tx: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-950/50 rounded-lg border border-slate-800/50 hover:border-slate-700 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-sm border border-slate-800">
                                        {tx.category === 'Giyim' ? '🧥' : tx.category === 'Aksesuar' ? '👓' : '📦'}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white line-clamp-1">{tx.name}</div>
                                        <div className="text-[10px] text-slate-500">
                                            {new Date(tx.purchased_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-red-400 font-mono font-bold text-sm">
                                    -{tx.price}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}