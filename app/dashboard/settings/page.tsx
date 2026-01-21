import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// --- SERVER ACTION: BİLGİLERİ GÜNCELLE ---
async function updateProfile(formData: FormData) {
  "use server";
  const { userId } = await auth();
  if (!userId) return;

  const db = getDb();
  const title = formData.get("title") as string;
  const bio = formData.get("bio") as string;
  const height = formData.get("height") as string;
  const weight = formData.get("weight") as string;

  await db.query(
    'UPDATE users SET title = ?, bio = ?, height = ?, weight = ? WHERE clerk_id = ?',
    [title, bio, height, weight, userId]
  );
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const db = getDb();
  const [rows]: any = await db.query('SELECT * FROM users WHERE clerk_id = ?', [userId]);
  const user = rows[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        
        {/* --- NAVİGASYON (GERİ DÖNME GARANTİSİ) --- */}
        <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4">
           {/* Mobilde parmakla basması kolay olsun diye büyük buton */}
           <Link href="/dashboard" className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl flex items-center gap-2 transition-colors">
             <span className="text-xl">⬅</span>
             <span className="font-bold text-sm">Geri Dön</span>
           </Link>
           
           <div>
             <h1 className="text-2xl font-bold text-white">Kimlik Ayarları 🧬</h1>
             <p className="text-slate-400 text-xs">Dijital İkizini Şekillendir</p>
           </div>
        </div>

        {/* --- AYAR FORMU --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8">
            <form action={updateProfile} className="space-y-6">
                
                {/* Unvan */}
                <div>
                    <label className="block text-xs text-slate-500 uppercase mb-2">Unvan / Meslek</label>
                    <input name="title" defaultValue={user?.title} placeholder="Örn: Siber Güvenlik Uzmanı" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-lg text-white focus:border-purple-500 outline-none transition-colors" />
                </div>

                {/* Biyografi */}
                <div>
                    <label className="block text-xs text-slate-500 uppercase mb-2">Biyografi</label>
                    <textarea name="bio" defaultValue={user?.bio} placeholder="Kendini tanıt..." rows={3} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-lg text-white focus:border-purple-500 outline-none transition-colors" />
                </div>

                {/* Fiziksel Veriler */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-slate-500 uppercase mb-2">Boy (cm)</label>
                        <input name="height" type="number" defaultValue={user?.height} placeholder="180" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-lg text-white" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 uppercase mb-2">Kilo (kg)</label>
                        <input name="weight" type="number" defaultValue={user?.weight} placeholder="75" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-lg text-white" />
                    </div>
                </div>

                <button className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-transform active:scale-95">
                    KİMLİĞİ GÜNCELLE
                </button>
            </form>
        </div>

      </div>
    </div>
  );
}