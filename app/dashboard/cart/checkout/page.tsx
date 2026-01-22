import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { User, CartItem, DatabaseError } from "@/lib/types";
import mysql from "mysql2/promise";

// --- SERVER ACTION: SİPARİŞİ TAMAMLA ---
async function completeOrder(formData: FormData) {
  "use server";
  
  let connection: mysql.PoolConnection | null = null;
  
  try {
    // 1. Authentication check
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Kullanıcı kimlik doğrulaması başarısız");
    }

    // 2. Get database connection
    let db: mysql.Pool;
    try {
      db = getDb();
    } catch (dbError) {
      const error = dbError as DatabaseError;
      console.error("Database connection error:", error);
      throw new Error("Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.");
    }

    // 3. Get connection for transaction
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
    } catch (error) {
      const dbError = error as DatabaseError;
      console.error("Transaction start error:", dbError);
      throw new Error("İşlem başlatılamadı. Veritabanı hatası.");
    }

    // 4. Get user with row-level locking to prevent race conditions
    let userRows: mysql.RowDataPacket[];
    try {
      [userRows] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT id, coins FROM users WHERE clerk_id = ? FOR UPDATE',
        [userId]
      );
    } catch (error) {
      await connection.rollback();
      connection.release();
      const dbError = error as DatabaseError;
      console.error("User query error:", dbError);
      throw new Error("Kullanıcı bilgileri alınamadı. Veritabanı hatası.");
    }

    const user = userRows[0] as { id: number; coins: number } | undefined;
    if (!user) {
      await connection.rollback();
      connection.release();
      throw new Error("Kullanıcı bulunamadı");
    }

    // 5. Get cart items with product prices
    let cartItems: mysql.RowDataPacket[];
    try {
      [cartItems] = await connection.query<mysql.RowDataPacket[]>(`
        SELECT c.product_id, c.quantity, p.price, p.name, p.id as product_id
        FROM cart c 
        JOIN products p ON c.product_id = p.id 
        WHERE c.user_id = ?
      `, [user.id]);
    } catch (error) {
      await connection.rollback();
      connection.release();
      const dbError = error as DatabaseError;
      console.error("Cart query error:", dbError);
      throw new Error("Sepet bilgileri alınamadı. Veritabanı hatası.");
    }

    // 6. Calculate total
    let total = 0;
    for (const item of cartItems) {
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      
      if (isNaN(price) || isNaN(quantity) || price < 0 || quantity <= 0) {
        await connection.rollback();
        connection.release();
        throw new Error("Geçersiz sepet verisi");
      }
      
      total += price * quantity;
    }

    if (total === 0 || cartItems.length === 0) {
      await connection.rollback();
      connection.release();
      throw new Error("Sepet boş!");
    }

    // 7. Balance check
    if (user.coins < total) {
      await connection.rollback();
      connection.release();
      throw new Error("Yetersiz bakiye!");
    }

    // 8. Execute transaction: Update balance, create order, add to inventory, clear cart
    try {
      // A. Deduct coins
      await connection.query(
        'UPDATE users SET coins = coins - ? WHERE id = ?',
        [total, user.id]
      );

      // B. Create order record
      const address = (formData.get("address") as string)?.trim() || "Dijital Teslimat";
      if (!address || address.length === 0) {
        throw new Error("Teslimat adresi gereklidir");
      }

      await connection.query(
        'INSERT INTO orders (user_id, total_price, status, address) VALUES (?, ?, ?, ?)',
        [user.id, total, 'Hazırlanıyor', address]
      );

      // C. Add items to inventory (one insert per quantity)
      for (const item of cartItems) {
        const productId = Number(item.product_id);
        const quantity = Number(item.quantity);
        
        if (isNaN(productId) || isNaN(quantity) || productId <= 0 || quantity <= 0) {
          throw new Error("Geçersiz ürün verisi");
        }

        // Insert each item quantity times
        for (let i = 0; i < quantity; i++) {
          await connection.query(
            'INSERT INTO inventory (clerk_id, product_id) VALUES (?, ?)',
            [userId, productId]
          );
        }
      }

      // D. Clear cart
      await connection.query('DELETE FROM cart WHERE user_id = ?', [user.id]);

      // 9. Commit transaction
      await connection.commit();
      connection.release();
      connection = null;

    } catch (error) {
      // Rollback on any error
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      const dbError = error as DatabaseError;
      console.error("Transaction execution error:", dbError);
      throw new Error("Sipariş tamamlanamadı. Veritabanı hatası.");
    }

    // 10. Success - revalidate and redirect
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/cart");
    redirect("/dashboard/inventory");

  } catch (error) {
    // Ensure connection is released even on error
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (releaseError) {
        console.error("Error releasing connection:", releaseError);
      }
    }

    // Log error for debugging
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
    console.error("completeOrder error:", error);
    
    // Re-throw to be handled by Next.js error boundary
    throw new Error(errorMessage);
  }
}

export default async function CheckoutPage() {
    const { userId } = await auth();
    if(!userId) redirect("/");
    
    let db: mysql.Pool;
    try {
      db = getDb();
    } catch (error) {
      console.error("Database connection error in CheckoutPage:", error);
      throw new Error("Veritabanı bağlantısı kurulamadı");
    }
    
    // Get user and calculate total
    let user: { id: number; coins: number } | null = null;
    let total = 0;

    try {
      const [userRows] = await db.query<mysql.RowDataPacket[]>(
        'SELECT id, coins FROM users WHERE clerk_id = ?',
        [userId]
      );
      user = userRows[0] as { id: number; coins: number } | null;

      if (user) {
        const [cartRows] = await db.query<mysql.RowDataPacket[]>(`
          SELECT SUM(p.price * c.quantity) as total 
          FROM cart c 
          JOIN products p ON c.product_id = p.id 
          WHERE c.user_id = ?
        `, [user.id]);
        total = Number(cartRows[0]?.total) || 0;
      }
    } catch (error) {
      console.error("Error fetching checkout data:", error);
      // Continue with default values (0 total, null user) to show error state
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
                        <div className={`${(user?.coins ?? 0) >= total ? 'text-green-400' : 'text-red-500'} font-bold`}>
                            {user?.coins ?? 0} HP
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
                        disabled={!user || (user.coins ?? 0) < total}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95
                            ${user && (user.coins ?? 0) >= total 
                                ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }
                        `}
                    >
                        {user && (user.coins ?? 0) >= total ? 'SİPARİŞİ ONAYLA ve BİTİR ✅' : 'BAKİYE YETERSİZ ❌'}
                    </button>
                </form>
            </div>
        </div>
    );
}