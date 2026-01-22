import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

// --- SERVER ACTION: SİPARİŞİ TAMAMLA ---
async function completeOrder(formData: FormData) {
  "use server";
  const { userId } = await auth();
  if (!userId) return;

  const db = getDb();
  
  try {
      // 1. Kullanıcıyı Bul
      const [userRows]: any = await db.query('SELECT id, coins FROM users WHERE clerk_id = ?', [userId]);
      const user = userRows[0];
      if (!user) throw new Error("Kullanıcı bulunamadı");

      // 2. Sepet Toplamını Hesapla
      // (SQL JOIN ile fiyatları çekip topluyoruz)
      const [cartItems]: any = await db.query(`
        SELECT c.product_id, c.quantity, p.price, p.name 
        FROM cart c 
        JOIN products p ON c.product_id = p.id 
        WHERE c.user_id = ?
      `, [user.id]);

      let total = 0;
      cartItems.forEach((item: any) => {
          total += (item.price * item.quantity);
      });

      if (total === 0) throw new Error("Sepet boş!");

      // 3. Bakiye Kontrolü ve Ödeme
      if (user.coins >= total) {
         
         // A. Parayı Düş
         await db.query('UPDATE users SET coins = coins - ? WHERE id = ?', [total, user.id]);
         
         // B. Siparişi Kaydet (Log amaçlı)
         const address = formData.get("address") as string || "Dijital Teslimat";
         await db.query(
            'INSERT INTO orders (user_id, total_price, status, address) VALUES (?, ?, ?, ?)', 
            [user.id, total, 'Hazırlanıyor', address]
         );
         
         // C. Ürünleri Envantere (Inventory) Aktar
         // Sepetteki her bir ürün adedi kadar inventory'e ekle
         for (const item of cartItems) {
            for(let i = 0; i < item.quantity; i++) {
                await db.query(
                    'INSERT INTO inventory (clerk_id, product_id) VALUES (?, ?)', 
                    [userId, item.product_id]
                );
            }
         }

         // D. Sepeti Boşalt
         await db.query('DELETE FROM cart WHERE user_id = ?', [user.id]);

      } else {
          // Bakiye yetersizse (Burada redirect ile hata sayfasına atılabilir ama şimdilik işlem yapmayalım)
          console.log("Yetersiz Bakiye!");
          return;
      }

  } catch (error) {
      console.error("ÖDEME HATASI:", error);
      return;
  }

  // Her şey başarılıysa Envantere git
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/finance");
  redirect("/dashboard/inventory");
}

export default async function CheckoutPage() {
    const { userId } = await auth();
    if(!userId) redirect("/");
    
    const db = getDb();
    
    // Toplam tutarı göstermek için hesapla
    const [userRows]: any = await db.query('SELECT id, coins FROM users WHERE clerk_id = ?', [userId]);
    const user = userRows[0];

    let total = 0;
    if (user) {
        const [cart]: any = await db.query(`
            SELECT SUM(p.price * c.quantity) as total 
            FROM cart c 
            JOIN products p ON c.product_id = p.id 
            WHERE c.user_id = ?
        `, [user.id]);
        total = Number(cart[0].total) || 0;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">💳 Ödeme Ekranı</h2>
                
                {/* Özet Kartı */}
                <div className="mb-8 p-6 bg-slate-950/50 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                        <div className="text-slate-400 text-sm">Ödenecek Tutar</div>
                        <div className="text-3xl font-bold text-white">{total} <span className="text-yellow-500 text-lg">HP</span></div>
                    </div>
                    <div className="text-right">
                        <div className="text-slate-400 text-sm">Mevcut Bakiyen</div>
                        <div className={`${user?.coins >= total ? 'text-green-400' : 'text-red-500'} font-bold`}>
                            {user?.coins || 0} HP
                        </div>
                    </div>
                </div>

                <form action={completeOrder} className="space-y-6">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Teslimat Adresi</label>
                        <textarea 
                            name="address" 
                            required 
                            placeholder="Dijital ürünler için e-posta adresiniz, fiziksel ürünler için ev adresiniz..." 
                            className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white h-24 focus:border-blue-500 outline-none transition-colors"
                        ></textarea>
                    </div>

                    <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" required id="terms" className="w-4 h-4" />
                            <label htmlFor="terms" className="text-sm text-slate-300">
                                <span className="text-blue-400 font-bold">HayalPerest</span> Satış Sözleşmesi'ni okudum.
                            </label>
                        </div>
                    </div>

                    <button 
                        disabled={user?.coins < total}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95
                            ${user?.coins >= total 
                                ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }
                        `}
                    >
                        {user?.coins >= total ? 'SİPARİŞİ ONAYLA ve BİTİR ✅' : 'BAKİYE YETERSİZ ❌'}
                    </button>
                </form>
            </div>
        </div>
    );
}