import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import Link from "next/link";

export default async function InventoryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");
  const db = getDb();

  // item_type bilgisini de çekiyoruz
  const [items]: any = await db.query(`
    SELECT 
      inventory.id as inventory_id,
      inventory.purchased_at,
      products.name,
      products.description,
      products.category,
      products.item_type
    FROM inventory
    JOIN products ON inventory.product_id = products.id
    WHERE inventory.clerk_id = ?
    ORDER BY inventory.purchased_at DESC
  `, [userId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
           <Link href="/dashboard" className="p-2 rounded-full bg-slate-900 hover:bg-slate-800">⬅</Link>
           <div>
             <h1 className="text-3xl font-bold text-white">Envanter 🎒</h1>
             <p className="text-slate-400">Hibrit Gardırop</p>
           </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 text-slate-500">Çantan boş.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item: any) => (
              <div key={item.inventory_id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all">
                 <div className="h-40 bg-slate-800 flex items-center justify-center text-5xl relative">
                    {item.category === 'Aksesuar' ? '👓' : item.category === 'Giyim' ? '🧥' : '📦'}
                    
                    {/* Durum Badge'i */}
                    {item.item_type !== 'DIGITAL' && (
                        <div className="absolute bottom-2 left-2 bg-orange-600 text-white text-[10px] px-2 py-1 rounded shadow-lg animate-pulse">
                            🚚 KARGO BEKLENİYOR
                        </div>
                    )}
                 </div>
                 
                 <div className="p-5">
                    <div className="flex justify-between mb-2">
                       <h3 className="font-bold text-white">{item.name}</h3>
                       <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">{item.item_type}</span>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                        {/* Dijital Kullanım Butonu */}
                        <button className="flex-1 py-2 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 rounded-lg text-xs">
                          {item.item_type === 'PHYSICAL' ? 'Dijital Önizleme' : 'Giydir / Kullan'}
                        </button>
                        
                        {/* Fiziksel Takip Butonu */}
                        {(item.item_type === 'PHYSICAL' || item.item_type === 'HYBRID') && (
                            <button className="flex-1 py-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-600/30 rounded-lg text-xs">
                              Kargo Takip
                            </button>
                        )}
                    </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}