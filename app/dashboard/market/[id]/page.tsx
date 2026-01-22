import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import type { User, Product, CartItem, DatabaseError } from "@/lib/types";
import mysql from "mysql2/promise";

// --- SERVER ACTION: SEPETE EKLE ---
async function addToCart(formData: FormData) {
  "use server";
  
  try {
    // 1. Authentication check
    const { userId } = await auth();
    const userClerk = await currentUser();
    
    if (!userId || !userClerk) {
      throw new Error("Kullanıcı kimlik doğrulaması başarısız");
    }

    // 2. Validate productId
    const productIdRaw = formData.get("productId");
    if (!productIdRaw) {
      throw new Error("Ürün ID'si bulunamadı");
    }

    const productId = Number(productIdRaw);
    if (isNaN(productId) || productId <= 0) {
      throw new Error("Geçersiz ürün ID'si");
    }

    // 3. Get database connection with error handling
    let db: mysql.Pool;
    try {
      db = getDb();
    } catch (dbError) {
      const error = dbError as DatabaseError;
      console.error("Database connection error:", error);
      throw new Error("Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.");
    }

    // 4. Verify product exists
    let productRows: mysql.RowDataPacket[];
    try {
      [productRows] = await db.query<mysql.RowDataPacket[]>(
        'SELECT id, name, price FROM products WHERE id = ?',
        [productId]
      );
    } catch (error) {
      const dbError = error as DatabaseError;
      console.error("Product query error:", dbError);
      throw new Error("Ürün bilgileri alınamadı. Veritabanı hatası.");
    }

    if (!productRows || productRows.length === 0) {
      throw new Error("Ürün bulunamadı");
    }

    // 5. Get or create user in database
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

    let dbUserId: number | undefined = userRows[0]?.id as number | undefined;

    if (!dbUserId) {
      // Create new user if doesn't exist
      const email = userClerk.emailAddresses[0]?.emailAddress || "no-mail";
      const name = userClerk.firstName || "Gezgin";
      
      try {
        const [insertResult] = await db.query<mysql.ResultSetHeader>(
          'INSERT INTO users (clerk_id, email, username, coins) VALUES (?, ?, ?, 1000)',
          [userId, email, name]
        );
        
        dbUserId = insertResult.insertId;
        
        // Fallback: If insertId is not available, query again
        if (!dbUserId || dbUserId === 0) {
          const [newUserRows] = await db.query<mysql.RowDataPacket[]>(
            'SELECT id FROM users WHERE clerk_id = ?',
            [userId]
          );
          dbUserId = newUserRows[0]?.id as number | undefined;
        }
      } catch (error) {
        const dbError = error as DatabaseError;
        console.error("User creation error:", dbError);
        throw new Error("Kullanıcı oluşturulamadı. Veritabanı hatası.");
      }

      if (!dbUserId) {
        throw new Error("Kullanıcı ID'si alınamadı");
      }
    }

    // 6. Check if product already in cart
    let cartRows: mysql.RowDataPacket[];
    try {
      [cartRows] = await db.query<mysql.RowDataPacket[]>(
        'SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?',
        [dbUserId, productId]
      );
    } catch (error) {
      const dbError = error as DatabaseError;
      console.error("Cart query error:", dbError);
      throw new Error("Sepet bilgileri alınamadı. Veritabanı hatası.");
    }

    // 7. Add or update cart item
    try {
      if (cartRows && cartRows.length > 0) {
        // Update existing cart item quantity
        await db.query(
          'UPDATE cart SET quantity = quantity + 1 WHERE id = ?',
          [cartRows[0].id]
        );
      } else {
        // Insert new cart item
        await db.query(
          'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)',
          [dbUserId, productId]
        );
      }
    } catch (error) {
      const dbError = error as DatabaseError;
      console.error("Cart update error:", dbError);
      throw new Error("Sepete ekleme başarısız. Veritabanı hatası.");
    }

    // 8. Success - revalidate and redirect
    revalidatePath("/dashboard/cart");
    revalidatePath("/dashboard/market");
    redirect("/dashboard/cart");

  } catch (error) {
    // Log error for debugging
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
    console.error("addToCart error:", error);
    
    // Re-throw to be handled by Next.js error boundary or return to same page
    // In production, you might want to use a toast notification system
    throw new Error(errorMessage);
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/");

  let db: mysql.Pool;
  try {
    db = getDb();
  } catch (error) {
    console.error("Database connection error in ProductDetailPage:", error);
    throw new Error("Veritabanı bağlantısı kurulamadı");
  }

  let product: mysql.RowDataPacket | null = null;
  try {
    const [products] = await db.query<mysql.RowDataPacket[]>(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    product = products[0] || null;
  } catch (error) {
    console.error("Error fetching product:", error);
    throw new Error("Ürün bilgileri alınamadı");
  }

  if (!product) return notFound();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard/market" className="text-slate-400 hover:text-white mb-8 inline-block">⬅ Markete Dön</Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex items-center justify-center">
                 {product.image_url ? (
                    <img src={product.image_url} className="rounded-2xl w-full" />
                 ) : (
                    <div className="text-9xl">📦</div>
                 )}
            </div>

            <div className="flex flex-col justify-center">
                <div className="mb-2">
                    <span className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded uppercase font-bold">{product.category}</span>
                </div>
                <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
                <p className="text-slate-400 mb-8">{product.description || "Açıklama yok."}</p>
                <div className="text-3xl font-bold text-yellow-400 mb-8">{product.price} HP</div>

                <form action={addToCart}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-white text-xl shadow-lg hover:shadow-green-900/30 transition-all">
                        SEPETE EKLE 🛒
                    </button>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
}