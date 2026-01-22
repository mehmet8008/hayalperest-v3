import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function completeOrder(formData: FormData) {
  "use server";
  const { userId } = await auth();
  const db = getDb();
  
  // 1. Kullanıcı ID ve Bakiye bul
  const [u]: any = await db.query('SELECT id, coins FROM users WHERE clerk_id = ?', [userId]);
  const user = u[0];

  // 2. Sepet Toplamını Bul
  const [cart]: any = await db.query('SELECT SUM(p.price * c.quantity) as total FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?', [user.id]);
  const total = Number(cart[0].total);

  // 3. Adres Bilgisi
  const address = formData.get("address") as string;

  // 4. Para Yetiyor mu?
  if (user.coins >= total) {
     // A. Parayı Çek
     await db.query('UPDATE users SET coins = coins - ? WHERE id = ?', [total, user.id]);
     
     // B. Siparişi Kaydet
     await db.query('INSERT INTO orders (user_id, total_price, address, status) VALUES (?, ?, ?, ?)', [user.id, total, address, 'Hazırlanıyor']);
     
     // C. Envantere Aktar (Burada detaylı logic gerekir ama basitçe sepetteki her şeyi inventory'e atıyoruz)
     // (Gerçek projede order_items tablosu da olur, şimdilik inventory'e atıp geçiyoruz ki giyebilsin)
     const [items]: any = await db.query('SELECT product_id FROM cart WHERE user_id = ?', [user.id]);
     for (const item of items) {
        await db.query('INSERT INTO inventory (clerk_id, product_id) VALUES (?, ?)', [userId, item.product_id]);
     }

     // D. Sepeti Boşalt
     await db.query('DELETE FROM cart WHERE user_id = ?', [user.id]);

     redirect("/dashboard/inventory"); // Başarılı!
  }
}

export default async function CheckoutPage() {
    const { userId } = await auth();
    if(!userId) redirect("/");
    
    // Sepet toplamını gösterelim
    const db = getDb();
    const [u]: any = await db.query('SELECT id FROM users WHERE clerk_id = ?', [userId]);
    const [cart]: any = await db.query('SELECT SUM(p.price * c.quantity) as total FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?', [u[0].id]);
    const total = cart[0].total || 0;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-slate-900 p-8 rounded-2xl border border-slate-800">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">💳 Ödeme ve Teslimat</h2>
                
                <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg text-blue-200">
                    <span className="font-bold">Ödenecek Tutar:</span> {total} HP Coin
                </div>

                <form action={completeOrder} className="space-y-6">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Teslimat Adresi (Fiziksel Ürünler İçin)</label>
                        <textarea name="address" required placeholder="Mahalle, Sokak, No, Şehir..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white h-24"></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Kart Sahibi</label>
                            <input type="text" placeholder="Ad Soyad" className="w-full bg-slate-950 border border-slate-700 p-3 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Kart Numarası</label>
                            <input type="text" placeholder="0000 0000 0000 0000" className="w-full bg-slate-950 border border-slate-700 p-3 rounded" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Son Kullanma</label>
                            <input type="text" placeholder="AA/YY" className="w-full bg-slate-950 border border-slate-700 p-3 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">CVC</label>
                            <input type="text" placeholder="123" className="w-full bg-slate-950 border border-slate-700 p-3 rounded" />
                        </div>
                    </div>

                    <button className="w-full py-4 bg-green-600 hover:bg-green-500 font-bold rounded-xl text-lg mt-4 shadow-lg shadow-green-900/20">
                        SİPARİŞİ ONAYLA ✅
                    </button>
                </form>
            </div>
        </div>
    );
}