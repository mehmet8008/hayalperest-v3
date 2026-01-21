import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// --- SERVER ACTION: EŞYAYI KUŞAN (GİY) ---
async function equipItem(formData: FormData) {
  "use server";
  const { userId } = await auth();
  if (!userId) return;

  const itemName = formData.get("itemName") as string;
  const itemIcon = formData.get("itemIcon") as string; // Örn: 🧥
  
  // Rozet oluştur: "🧥 Titanyum Ceket"
  const badge = `${itemIcon} ${itemName}`;

  const db = getDb();
  await db.query(
    'UPDATE users SET equipped_badge = ? WHERE clerk_id = ?',
    [badge, userId]
  );
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/community"); // Sohbette de güncellensin
}

export default async function InventoryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const db = getDb();

  // 1. Çantadaki Eşyaları Çek
  const [inventory]: any = await db.query(`
    SELECT p.id, p.name, p.category, p.image_url, p.item_type, i.purchased_at 
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    WHERE i.clerk_id = ?
    ORDER BY i.purchased_at DESC
  `, [userId]);

  // 2. Kullanıcının şu an ne giydiğini çek (Butonu ona göre ayarlayacağız)
  const [userRows]: any = await db.query('SELECT equipped_badge FROM users WHERE clerk_id = ?', [userId]);
  const currentBadge = userRows[0]?.equipped_badge;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
           <Link href="/dashboard" className="p-3 bg-slate-900 rounded-xl border border-slate-700">⬅</Link>
           <div>
             <h1 className="text-3xl font-bold text-blue-400">Envanter 🎒</h1>
             <p className="text-slate-400 text-sm">Sahip olduğun varlıklar.</p>
           </div>
        </div>

        {/* ŞU AN GİYİLEN (Varsa Göster) */}
        {currentBadge && (
            <div className="bg-gradient-to-r from-blue-900/40 to-slate-900 border border-blue-500/30 p-4 rounded-xl mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <div>
                        <div className="text-xs text-blue-300 font-bold uppercase">Şu An Kuşanıldı</div>
                        <div className="text-white font-bold">{currentBadge}</div>
                    </div>
                </div>
            </div>
        )}

        {/* Eşya Listesi */}
        {inventory.length === 0 ? (
            <div className="text-center py-20 bg-slate-900 rounded-xl border border-dashed border-slate-800">
                <div className="text-4xl mb-4">📦</div>
                <h3 className="text-xl font-bold text-slate-300">Çantan Boş</h3>
                <p className="text-slate-500 mb-4">Henüz bir şey satın almadın.</p>
                <Link href="/dashboard/market" className="px-6 py-2 bg-pink-600 rounded-lg font-bold text-white hover:bg-pink-500">
                    Markete Git
                </Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {inventory.map((item: any) => {
                    // İkon belirle
                    const icon = item.category === 'Aksesuar' ? '👓' : item.category === 'Giyim' ? '🧥' : item.category === 'Ayakkabı' ? '👟' : '📦';
                    // Bu eşya şu an giyili mi?
                    const isEquipped = currentBadge === `${icon} ${item.name}`;

                    return (
                        <div key={item.id} className={`relative bg-slate-900 border rounded-xl p-4 transition-all ${isEquipped ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-slate-800 hover:border-slate-600'}`}>
                            
                            {isEquipped && <div className="absolute top-2 right-2 bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded text-white">GİYİLİ</div>}

                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center text-3xl">
                                    {icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white line-clamp-1">{item.name}</h3>
                                    <div className="text-xs text-slate-500">{item.category} • {item.item_type}</div>
                                </div>
                            </div>

                            <form action={equipItem}>
                                <input type="hidden" name="itemName" value={item.name} />
                                <input type="hidden" name="itemIcon" value={icon} />
                                
                                <button 
                                    disabled={isEquipped}
                                    className={`w-full py-2 rounded-lg font-bold text-sm transition-colors ${
                                        isEquipped 
                                        ? 'bg-slate-800 text-slate-500 cursor-default' 
                                        : 'bg-slate-800 hover:bg-blue-600 text-white border border-slate-700 hover:border-blue-500'
                                    }`}
                                >
                                    {isEquipped ? 'KULLANIMDA' : 'KUŞAN / GİY'}
                                </button>
                            </form>
                        </div>
                    );
                })}
            </div>
        )}

      </div>
    </div>
  );
}