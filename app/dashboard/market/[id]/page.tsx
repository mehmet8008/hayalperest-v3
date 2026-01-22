import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// --- SERVER ACTION: SATIN AL (DÜZELTİLMİŞ VERSİYON) ---
async function buyItem(formData: FormData) {
  "use server";
  const { userId } = await auth();
  if (!userId) return;

  const productId = Number(formData.get("productId"));
  const price = Number(formData.get("price"));

  const db = getDb();
  let success = false;

  try {
    // 1. Kullanıcıyı ve Bakiyesini Bul
    const [userRows]: any = await db.query('SELECT id, coins FROM users WHERE clerk_id = ?', [userId]);
    const user = userRows[0];

    if (user && user.coins >= price) {
      // 2. Parayı Düş
      await db.query('UPDATE users SET coins = coins - ? WHERE id = ?', [price, user.id]);

      // 3. Envantere Ekle (HATALI KISIM DÜZELTİLDİ: 'product_name' kaldırıldı)
      await db.query(
        'INSERT INTO inventory (clerk_id, product_id) VALUES (?, ?)',
        [userId, productId]
      );

      success = true;
    }
  } catch (error) {
    console.error("SATIN ALMA HATASI:", error); // Hata olursa loglara basar
  }

  // İşlem başarılıysa yönlendir (Try-Catch dışında olmalı)
  if (success) {
    revalidatePath("/dashboard/market");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/finance");
    redirect("/dashboard/inventory");
  }
}

export default async function ProductDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/");

  const db = getDb();

  // Ürünü Çek
  const [products]: any = await db.query('SELECT * FROM products WHERE id = ?', [id]);
  const product = products[0];

  if (!product) {
    return notFound();
  }

  // Kullanıcı Bakiyesini Çek
  const [users]: any = await db.query('SELECT coins FROM users WHERE clerk_id = ?', [userId]);
  const userCoins = users[0]?.coins || 0;
  const canBuy = userCoins >= product.price;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        
        {/* Navigasyon */}
        <Link href="/dashboard/market" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <span>⬅</span> Markete Dön
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* SOL: Büyük Görsel */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative aspect-square bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex items-center justify-center p-8">
                    {product.image_url && product.image_url.startsWith('http') ? (
                        <img src={product.image_url} alt={product.name} className="object-cover w-full h-full rounded-2xl hover:scale-105 transition-transform duration-500" />
                    ) : (
                        <div className="text-9xl opacity-20">
                            {product.category === 'Aksesuar' ? '👓' : '🧥'}
                        </div>
                    )}
                </div>
            </div>

            {/* SAĞ: Detaylar ve Satın Alma */}
            <div className="flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                    <span className="bg-slate-800 text-cyan-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {product.item_type || 'Fiziksel'}
                    </span>
                    <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {product.category}
                    </span>
                </div>

                <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                    {product.name}
                </h1>

                <p className="text-lg text-slate-400 mb-8 leading-relaxed border-l-4 border-slate-800 pl-4">
                    {product.description || "Bu ürün için özel bir açıklama bulunmuyor. Metaverse standartlarına uygun üretilmiştir."}
                </p>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 uppercase mb-1">Fiyat</div>
                        <div className="text-3xl font-bold text-yellow-400">{product.price} HP</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase mb-1">Cüzdanın</div>
                        <div className={`${canBuy ? 'text-green-400' : 'text-red-500'} font-bold`}>
                            {userCoins} HP
                        </div>
                    </div>
                </div>

                <form action={buyItem}>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="price" value={product.price} />
                    
                    <button 
                        disabled={!canBuy}
                        className={`w-full py-5 rounded-xl font-bold text-xl transition-all shadow-lg flex items-center justify-center gap-3 ${
                            canBuy 
                            ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-purple-900/30 hover:shadow-purple-900/50 hover:-translate-y-1' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                    >
                        {canBuy ? (
                            <>
                                <span>SATIN AL</span>
                                <span>🛍️</span>
                            </>
                        ) : (
                            <>
                                <span>YETERSİZ BAKİYE</span>
                                <span>🔒</span>
                            </>
                        )}
                    </button>
                </form>
                {!canBuy && (
                    <div className="mt-4 text-center">
                        <Link href="/dashboard/finance" className="text-sm text-pink-400 hover:text-white underline">
                            Finans Merkezinden Para Topla →
                        </Link>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}