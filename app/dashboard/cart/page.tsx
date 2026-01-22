import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import type { DatabaseError } from "@/lib/types";
import mysql from "mysql2/promise";

// --- SERVER ACTION: SEPETİ TEMİZLE ---
async function clearCart() {
    "use server";
    
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

        // 3. Get user ID
        let userRows: mysql.RowDataPacket[];
        try {
            [userRows] = await db.query<mysql.RowDataPacket[]>(
                'SELECT id FROM users WHERE clerk_id = ?',
                [userId]
            );
        } catch (error) {
            const dbError = error as DatabaseError;
            console.error("User query error:", dbError);
            throw new Error("Kullanıcı bilgileri alınamadı. Veritabanı hatası.");
        }

        const dbUserId = userRows[0]?.id as number | undefined;
        if (!dbUserId) {
            // User doesn't exist, nothing to clear
            revalidatePath("/dashboard/cart");
            return;
        }

        // 4. Clear cart
        try {
            await db.query('DELETE FROM cart WHERE user_id = ?', [dbUserId]);
        } catch (error) {
            const dbError = error as DatabaseError;
            console.error("Cart clear error:", dbError);
            throw new Error("Sepet temizlenemedi. Veritabanı hatası.");
        }

        // 5. Success - revalidate
        revalidatePath("/dashboard/cart");

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
        console.error("clearCart error:", error);
        // Don't throw - just log and revalidate to show current state
        revalidatePath("/dashboard/cart");
    }
}

export default async function CartPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  let db: mysql.Pool;
  try {
    db = getDb();
  } catch (error) {
    console.error("Database connection error in CartPage:", error);
    throw new Error("Veritabanı bağlantısı kurulamadı");
  }
  
  // Get cart items and calculate total
  let cartItems: mysql.RowDataPacket[] = [];
  let total = 0;

  try {
    const [items] = await db.query<mysql.RowDataPacket[]>(`
      SELECT c.id, c.quantity, p.name, p.price, p.image_url, p.category 
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = (SELECT id FROM users WHERE clerk_id = ?)
    `, [userId]);
    
    cartItems = items || [];
    
    // Calculate total
    total = cartItems.reduce((acc: number, item: mysql.RowDataPacket) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return acc + (price * quantity);
    }, 0);
  } catch (error) {
    console.error("Error fetching cart items:", error);
    // Continue with empty cart to show error state
    cartItems = [];
    total = 0;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Alışveriş Sepeti 🛒</h1>

        {cartItems.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-500 mb-4">Sepetin boş.</p>
                <Link href="/dashboard/market" className="text-blue-400 hover:underline">Alışverişe Başla</Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Ürün Listesi */}
                <div className="lg:col-span-2 space-y-4">
                    {cartItems.map((item: any) => (
                        <div key={item.id} className="flex gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <div className="w-20 h-20 bg-slate-800 rounded-lg flex items-center justify-center text-2xl">
                                {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover rounded" /> : '📦'}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold">{item.name}</h3>
                                <p className="text-slate-400 text-sm">{item.category}</p>
                                <div className="mt-2 text-sm text-slate-500">Adet: {item.quantity}</div>
                            </div>
                            <div className="font-bold text-yellow-400">{item.price * item.quantity} HP</div>
                        </div>
                    ))}
                    
                    <form action={clearCart} className="text-right">
                        <button className="text-xs text-red-500 hover:underline">Sepeti Boşalt</button>
                    </form>
                </div>

                {/* Özet ve Checkout */}
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-fit">
                    <h3 className="text-xl font-bold mb-4">Sipariş Özeti</h3>
                    <div className="flex justify-between mb-2 text-slate-400">
                        <span>Ara Toplam</span>
                        <span>{total} HP</span>
                    </div>
                    <div className="flex justify-between mb-6 text-slate-400">
                        <span>Kargo</span>
                        <span className="text-green-400">Bedava</span>
                    </div>
                    <div className="flex justify-between mb-6 text-xl font-bold text-white border-t border-slate-800 pt-4">
                        <span>TOPLAM</span>
                        <span>{total} HP</span>
                    </div>
                    
                    <Link href="/dashboard/cart/checkout" className="block w-full py-3 bg-green-600 hover:bg-green-500 text-center rounded-lg font-bold transition-colors">
                        ÖDEMEYE GEÇ →
                    </Link>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}