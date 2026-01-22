import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// --- SERVER ACTION ---
async function addToCart(formData: FormData) {
  "use server";
  
  // 1. Clerk Bilgilerini Al
  const { userId } = await auth();
  const userClerk = await currentUser();
  
  if (!userId || !userClerk) return;

  const productId = Number(formData.get("productId"));
  const db = getDb();
  let shouldRedirect = false;

  try {
    // 2. Kullanıcıyı DB'de Bul veya Oluştur
    // (Karmaşık JOIN sorguları yerine düz mantık)
    const [users]: any = await db.query('SELECT id FROM users WHERE clerk_id = ?', [userId]);
    let dbUserId = users[0]?.id;

    if (!dbUserId) {
        // Kullanıcı yoksa hemen oluştur
        const email = userClerk.emailAddresses[0]?.emailAddress || "no-mail";
        const name = userClerk.firstName || "Gezgin";
        
        const result: any = await db.query(
            'INSERT INTO users (clerk_id, email, username, coins) VALUES (?, ?, ?, 1000)',
            [userId, email, name]
        );
        dbUserId = result.insertId; // Yeni ID'yi al
        
        // Eğer insertId dönmezse tekrar select at (TiDB garantisi)
        if (!dbUserId) {
             const [newUsers]: any = await db.query('SELECT id FROM users WHERE clerk_id = ?', [userId]);
             dbUserId = newUsers[0]?.id;
        }
    }

    // 3. Sepete Ekle (Basit, Hata Vermez)
    // Önce var mı diye bak
    const [cartItems]: any = await db.query(
        'SELECT id FROM cart WHERE user_id = ? AND product_id = ?',
        [dbUserId, productId]
    );

    if (cartItems.length > 0) {
        // Varsa artır
        await db.query('UPDATE cart SET quantity = quantity + 1 WHERE id = ?', [cartItems[0].id]);
    } else {
        // Yoksa ekle
        await db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)', [dbUserId, productId]);
    }

    shouldRedirect = true;

  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    // Hata olsa bile kullanıcıya hissettirme, belki loglarda görürüz
  }

  // 4. Yönlendirme (Try-Catch DIŞINDA olmak zorunda)
  if (shouldRedirect) {
      revalidatePath("/dashboard/cart");
      redirect("/dashboard/cart");
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/");

  const db = getDb();
  const [products]: any = await db.query('SELECT * FROM products WHERE id = ?', [id]);
  const product = products[0];

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