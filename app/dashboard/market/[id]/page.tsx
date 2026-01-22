import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// --- SERVER ACTION: SEPETE EKLE ---
async function addToCart(formData: FormData) {
  "use server";
  const { userId } = await auth();
  if (!userId) return;

  const productId = Number(formData.get("productId"));
  const db = getDb();

  // Kullanıcı ID'sini bul
  const [userRows]: any = await db.query('SELECT id FROM users WHERE clerk_id = ?', [userId]);
  const user = userRows[0];

  if (user) {
    // Ürün zaten sepette var mı?
    const [existing]: any = await db.query(
        'SELECT * FROM cart WHERE user_id = ? AND product_id = ?', 
        [user.id, productId]
    );

    if (existing.length > 0) {
        // Varsa adedini artır
        await db.query('UPDATE cart SET quantity = quantity + 1 WHERE id = ?', [existing[0].id]);
    } else {
        // Yoksa yeni ekle
        await db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)', [user.id, productId]);
    }

    revalidatePath("/dashboard/cart"); // Sepet sayfasını güncelle
    redirect("/dashboard/cart"); // Sepete yönlendir
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
  const [products]: any = await db.query('SELECT * FROM products WHERE id = ?', [id]);
  const product = products[0];

  if (!product) return notFound();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <Link href="/dashboard/market" className="text-slate-400 hover:text-white mb-8 inline-block">⬅ Markete Dön</Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex items-center justify-center">
                 {product.image_url ? <img src={product.image_url} className="rounded-2xl w-full" /> : <div className="text-9xl">📦</div>}
            </div>

            <div className="flex flex-col justify-center">
                <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
                <p className="text-slate-400 mb-8">{product.description}</p>
                <div className="text-3xl font-bold text-yellow-400 mb-8">{product.price} HP</div>

                <form action={addToCart}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white text-xl transition-all">
                        SEPETE EKLE 🛒
                    </button>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
}