import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// --- SERVER ACTION: ÜRÜN EKLE ---
async function addProduct(formData: FormData) {
  "use server";
  const db = getDb();
  
  const name = formData.get("name") as string;
  const desc = formData.get("desc") as string;
  const price = Number(formData.get("price"));
  const category = formData.get("category") as string;
  const image = formData.get("image") as string;
  const type = formData.get("type") as string;

  await db.query(
    'INSERT INTO products (name, description, price, category, image_url, item_type) VALUES (?, ?, ?, ?, ?, ?)',
    [name, desc, price, category, image, type]
  );
  revalidatePath("/dashboard/market");
}

// --- SERVER ACTION: VİDEO EKLE ---
async function addVideo(formData: FormData) {
  "use server";
  const db = getDb();

  const title = formData.get("title") as string;
  const desc = formData.get("desc") as string;
  const category = formData.get("category") as string;
  const videoUrl = formData.get("videoUrl") as string;
  
  // YouTube Thumbnail
  let thumbUrl = "";
  if (videoUrl.includes("/embed/")) {
      const videoId = videoUrl.split("/embed/")[1]?.split("?")[0];
      thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  await db.query(
    'INSERT INTO videos (title, description, category, video_url, thumbnail_url) VALUES (?, ?, ?, ?, ?)',
    [title, desc, category, videoUrl, thumbUrl]
  );
  revalidatePath("/dashboard/cinema");
}

export default async function AdminPage() {
  const { userId } = await auth();
  
  if (!userId) redirect("/");

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
      {/* NAVİGASYON GÜNCELLEMESİ */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-red-500">YÖNETİM PANELİ 🛠️</h1>
                <p className="text-xs text-slate-500">İçerik Yönetim Sistemi</p>
            </div>
            
            {/* GERİ DÖN BUTONU */}
            <Link href="/dashboard" className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg text-sm transition-colors border border-slate-700">
                <span>⬅</span>
                <span className="hidden md:inline">Komuta Merkezine Dön</span>
                <span className="md:hidden">Dön</span>
            </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* --- FORM 1: ÜRÜN EKLEME --- */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <h2 className="text-xl font-bold text-pink-500 mb-4">🛍️ Yeni Ürün Ekle</h2>
                <form action={addProduct} className="space-y-4">
                    <input name="name" placeholder="Ürün Adı" required className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white" />
                    <textarea name="desc" placeholder="Açıklama" required className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white" />
                    
                    <div className="flex gap-2">
                        <input name="price" type="number" placeholder="Fiyat (HP)" required className="w-1/2 bg-slate-950 border border-slate-700 p-3 rounded text-white" />
                        <select name="category" className="w-1/2 bg-slate-950 border border-slate-700 p-3 rounded text-white">
                            <option value="Giyim">Giyim</option>
                            <option value="Aksesuar">Aksesuar</option>
                            <option value="Ayakkabı">Ayakkabı</option>
                            <option value="Hizmet">Hizmet</option>
                        </select>
                    </div>

                    <select name="type" className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white">
                        <option value="DIGITAL">👾 Sadece Dijital</option>
                        <option value="PHYSICAL">📦 Sadece Fiziksel</option>
                        <option value="HYBRID">✨ Hibrit (Fiziksel + Dijital)</option>
                    </select>

                    <input name="image" placeholder="Resim URL (Unsplash vb.)" className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white" />
                    
                    <button className="w-full py-3 bg-pink-600 hover:bg-pink-500 font-bold rounded text-white">
                        Markete Ekle
                    </button>
                </form>
            </div>

            {/* --- FORM 2: VİDEO EKLEME --- */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <h2 className="text-xl font-bold text-red-500 mb-4">🎬 Yeni Video Ekle</h2>
                <form action={addVideo} className="space-y-4">
                    <input name="title" placeholder="Video Başlığı" required className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white" />
                    <textarea name="desc" placeholder="Kısa Açıklama" required className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white" />
                    
                    <select name="category" className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white">
                        <option value="Bilim Kurgu">Bilim Kurgu</option>
                        <option value="Eğitim">Eğitim</option>
                        <option value="Oyun / Hikaye">Oyun / Hikaye</option>
                        <option value="Müzik">Müzik</option>
                    </select>

                    <input name="videoUrl" placeholder="YouTube Embed Linki (örn: https://www.youtube.com/embed/XXXX)" required className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white text-xs" />
                    {/* DÜZELTME: Ok işareti (->) yerine özel karakter kodu (&rarr;) kullandık */}
                    <p className="text-[10px] text-slate-500">*YouTube videosuna sağ tıkla &rarr; Embed Kodu Al &rarr; src içindeki linki kopyala.</p>

                    <button className="w-full py-3 bg-red-600 hover:bg-red-500 font-bold rounded text-white">
                        Sinemaya Ekle
                    </button>
                </form>
            </div>

        </div>
      </div>
    </div>
  );
}