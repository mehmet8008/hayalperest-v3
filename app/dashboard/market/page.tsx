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
      {/* --- GÜNCELLENMİŞ BAŞLIK VE NAVİGASYON --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-slate-800 pb-6">
        
        <div className="flex items-center gap-4">
            {/* BURAYA GERİ DÖN BUTONU EKLENDİ */}
            <Link href="/dashboard" className="p-3 bg-slate-900 rounded-xl border border-slate-700 hover:border-pink-500 transition-colors">
                ⬅
            </Link>
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
                    HayalPerest Store 🛍️
                </h1>
                <p className="text-slate-400 text-sm">Fiziksel ve Dijital Koleksiyonlar</p>
            </div>
        </div>
        
        <div className="bg-slate-900 border border-yellow-500/30 px-6 py-3 rounded-full flex items-center gap-3">
           <span className="text-2xl">💰</span>
           <span className="text-xl font-bold text-yellow-400">{myCoins} HP Coin</span>
        </div>
      </div>

      {/* ... Kodun üst kısımları aynı ... */}

        {/* ÜRÜN LİSTESİ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product: any) => (
            // KARTIN TAMAMI ARTIK BİR LİNK
            <Link 
                key={product.id} 
                href={`/dashboard/market/${product.id}`}
                className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-pink-500/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-900/10 flex flex-col"
            >
               
               {/* Resim Alanı */}
               <div className="h-48 bg-slate-950 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>
                  
                  {product.image_url && product.image_url.startsWith('http') ? (
                     <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                     <div className="text-6xl opacity-30 group-hover:scale-110 transition-transform">
                        {product.category === 'Aksesuar' ? '👓' : product.category === 'Giyim' ? '🧥' : '📦'}
                     </div>
                  )}

                  <div className="absolute top-3 right-3 z-20 bg-slate-900/80 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded border border-slate-700">
                    {product.item_type || 'Fiziksel'}
                  </div>
               </div>

               {/* İçerik */}
               <div className="p-5 flex flex-col flex-1">
                  <div className="text-xs text-pink-500 font-bold uppercase mb-1">{product.category}</div>
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{product.name}</h3>
                  <p className="text-slate-400 text-sm line-clamp-2 mb-4 flex-1">
                    {product.description || "Açıklama yok."}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800">
                     <div className="text-2xl font-bold text-white">{product.price} <span className="text-sm text-yellow-500">HP</span></div>
                     <span className="text-sm text-slate-500 group-hover:text-white transition-colors">İncele →</span>
                  </div>
               </div>
            </Link>
          ))}
        </div>
        
{/* ... Kodun geri kalanı aynı ... */}
      <div className="mt-12 text-center">
        <Link href="/dashboard" className="text-slate-500 hover:text-white underline">&larr; Dön</Link>
      </div>
    </div>
  );
}