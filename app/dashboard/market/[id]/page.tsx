import { auth, currentUser } from "@clerk/nextjs/server"; // currentUser eklendi
import { redirect, notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// --- SERVER ACTION: SEPETE EKLE (KURŞUN GEÇİRMEZ VERSİYON) ---
async function addToCart(formData: FormData) {
  "use server";
  const { userId } = await auth();
  const userClerk = await currentUser(); // Clerk bilgilerini al
  if (!userId || !userClerk) return;

  const productId = Number(formData.get("productId"));
  const db = getDb();
  let success = false;

  try {
    console.log("Sepet işlemi başladı. Ürün ID:", productId);

    // 1. Kullanıcı veritabanında var mı?
    const [userRows]: any = await db.query('SELECT id FROM users WHERE clerk_id = ?', [userId]);
    let dbUser = userRows[0];

    // ⚠️ KRİTİK NOKTA: Kullanıcı yoksa OLUŞTUR
    if (!dbUser) {
        console.log("Kullanıcı DB'de bulunamadı, oluşturuluyor...");
        const email = userClerk.emailAddresses[0].emailAddress;
        const name = userClerk.firstName || "Gezgin";
        
        await db.query(
            'INSERT INTO users (clerk_id, email, username, coins) VALUES (?, ?, ?, 1000)',
            [userId, email, name]
        );
        
        // Yeni oluşturulan kullanıcıyı çek
        const [newUserRows]: any = await db.query('SELECT id FROM users WHERE clerk_id = ?', [userId]);
        dbUser = newUserRows[0];
    }

    // 2. Artık kullanıcımız kesin var. Sepete ekle.
    if (dbUser) {
        // Ürün zaten sepette var mı?
        const [existing]: any = await db.query(
            'SELECT id FROM cart WHERE user_id = ? AND product_id = ?', 
            [dbUser.id, productId]
        );

        if (existing.length > 0) {
            // Varsa artır
            await db.query('UPDATE cart SET quantity = quantity + 1 WHERE id = ?', [existing[0].id]);
        } else {
            // Yoksa ekle
            await db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)', [dbUser.id, productId]);
        }
        success = true;
    }

  } catch (error) {
      console.error("SEPET HATASI (Detaylı):", error);
      // Hata olsa bile sayfayı patlatma, sadece logla.
  }

  // Yönlendirmeyi try-catch dışında yapıyoruz ki hata fırlatmasın
  if (success) {
      revalidatePath("/dashboard/cart");
      redirect("/dashboard/cart");
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex items-center justify-center relative overflow-hidden">
                 {product.image_url ? (
                    <img src={product.image_url} className="rounded-2xl w-full shadow-2xl" />
                 ) : (
                    <div className="text-9xl">📦</div>
                 )}
            </div>

            <div className="flex flex-col justify-center">
                <div className="mb-2">
                    <span className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded uppercase font-bold">{product.category}</span>
                </div>
                <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
                <p className="text-slate-400 mb-8 border-l-2 border-slate-700 pl-4">{product.description || "Standart üretim."}</p>
                <div className="text-3xl font-bold text-yellow-400 mb-8">{product.price} HP</div>

                <form action={addToCart}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white text-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                        SEPETE EKLE 🛒
                    </button>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
}