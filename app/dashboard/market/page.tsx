import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// --- SERVER ACTION ---
async function buyItem(formData: FormData) {
  "use server";
  
  const productId = formData.get("productId");
  const price = Number(formData.get("price"));
  // Gelecekte buraya: "Eğer ürün fizikselse, adres var mı kontrol et" eklenecek.
  
  const { userId } = await auth();
  if (!userId) return;

  const db = getDb();
  const [userRows]: any = await db.query('SELECT coins FROM users WHERE clerk_id = ?', [userId]);
  const userCoins = userRows[0]?.coins || 0;

  if (userCoins < price) return;

  try {
    await db.query('UPDATE users SET coins = coins - ? WHERE clerk_id = ?', [price, userId]);
    await db.query('INSERT INTO inventory (clerk_id, product_id) VALUES (?, ?)', [userId, productId]);
    revalidatePath("/dashboard/market");
    revalidatePath("/dashboard"); 
  } catch (error) {
    console.error("Hata:", error);
  }
}

export default async function MarketPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const db = getDb();
  const [products]: any = await db.query('SELECT * FROM products');
  const [userRows]: any = await db.query('SELECT coins FROM users WHERE clerk_id = ?', [userId]);
  const myCoins = userRows[0]?.coins || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div>
           <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
             HayalPerest Store 🛍️
           </h1>
           <p className="text-slate-400">Fiziksel ve Dijital Koleksiyonlar</p>
        </div>
        <div className="bg-slate-900 border border-yellow-500/30 px-6 py-3 rounded-full flex items-center gap-3">
           <span className="text-2xl">💰</span>
           <span className="text-xl font-bold text-yellow-400">{myCoins} HP Coin</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map((product: any) => (
          <div key={product.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-pink-500/50 transition-all">
            
            {/* Resim Alanı */}
            <div className="h-48 bg-slate-800 flex items-center justify-center text-5xl relative">
               {product.category === 'Aksesuar' ? '👓' : product.category === 'Giyim' ? '🧥' : '📦'}
               
               {/* TÜR ETİKETİ (YENİ) */}
               <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold border ${
                 product.item_type === 'PHYSICAL' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                 product.item_type === 'HYBRID' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
               }`}>
                 {product.item_type === 'PHYSICAL' ? '📦 FİZİKSEL KARGO' :
                  product.item_type === 'HYBRID' ? '✨ FİZİKSEL + DİJİTAL' :
                  '👾 SADECE DİJİTAL'}
               </div>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-1">{product.name}</h3>
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">{product.description}</p>
              
              <div className="flex items-center justify-between mt-4">
                <span className="text-xl font-bold text-cyan-400">{product.price} HP</span>
                <form action={buyItem}>
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="price" value={product.price} />
                  {myCoins >= product.price ? (
                    <button type="submit" className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-pink-600/20">
                      Satın Al
                    </button>
                  ) : (
                    <button disabled className="px-4 py-2 bg-slate-800 text-slate-500 text-sm font-bold rounded-lg cursor-not-allowed">
                      Yetersiz
                    </button>
                  )}
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12 text-center">
        <Link href="/dashboard" className="text-slate-500 hover:text-white underline">&larr; Dön</Link>
      </div>
    </div>
  );
}