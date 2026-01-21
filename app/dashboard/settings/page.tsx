import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

// --- SERVER ACTION (Veriyi Kaydetme İşlemi) ---
async function updateProfile(formData: FormData) {
  "use server";
  
  const { userId } = await auth();
  if (!userId) return;

  const title = formData.get("title") as string;
  const bio = formData.get("bio") as string;
  const gender = formData.get("gender") as string;
  const height = formData.get("height");
  const weight = formData.get("weight");

  const db = getDb();
  
  await db.query(
    `UPDATE users SET title = ?, bio = ?, gender = ?, height = ?, weight = ? WHERE clerk_id = ?`,
    [title, bio, gender, height, weight, userId]
  );

  // İşlem bitince sayfayı yenile ki yeni veriler görünsün
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard"); // Ana paneli de güncelle
}

// --- SAYFA TASARIMI ---
export default async function SettingsPage() {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId) redirect("/");

  const db = getDb();
  
  // Mevcut bilgileri çekelim ki formda dolu gelsin
  const [rows]: any = await db.query('SELECT * FROM users WHERE clerk_id = ?', [userId]);
  const dbUser = rows[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        
        {/* Başlık */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
            Dijital İkiz Yapılandırması 🧬
          </h1>
          <p className="text-slate-400 mt-2">
            Fiziksel verilerini gir ki, yapay zeka sana en uygun kıyafetleri ve bedeni otomatik hesaplasın.
          </p>
        </div>

        <form action={updateProfile} className="space-y-8">
          
          {/* Bölüm 1: Kimlik */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">🆔</span> Kimlik Bilgileri
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Görünen İsim (Clerk'ten)</label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.firstName || ""} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-500 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm text-cyan-400 mb-2 font-medium">Unvan / Lakap</label>
                <input 
                  name="title" 
                  type="text" 
                  defaultValue={dbUser?.title || ""}
                  placeholder="Örn: Moda Tutkunu, Gamer..." 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-2">Biyografi (Hakkında)</label>
                <textarea 
                  name="bio" 
                  rows={3}
                  defaultValue={dbUser?.bio || ""}
                  placeholder="Kendini HayalPerest evrenine tanıt..." 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bölüm 2: Fiziksel Veriler (Kritik Kısım) */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm relative overflow-hidden">
             {/* Arka plan efekti */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[50px] rounded-full pointer-events-none"></div>

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">📏</span> Fiziksel Ölçüler (Akıllı Beden İçin)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Cinsiyet</label>
                <select 
                  name="gender" 
                  defaultValue={dbUser?.gender || "unspecified"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="unspecified">Belirtmek İstemiyorum</option>
                  <option value="male">Erkek</option>
                  <option value="female">Kadın</option>
                  <option value="non-binary">Non-binary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-purple-400 mb-2 font-medium">Boy (cm)</label>
                <input 
                  name="height" 
                  type="number" 
                  placeholder="175" 
                  defaultValue={dbUser?.height || ""}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-purple-400 mb-2 font-medium">Kilo (kg)</label>
                <input 
                  name="weight" 
                  type="number" 
                  placeholder="70" 
                  defaultValue={dbUser?.weight || ""}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
            
            <p className="text-xs text-slate-500 mt-4">
              * Bu veriler sadece sana uygun bedeni (S/M/L) hesaplamak ve dijital ikizini oluşturmak için kullanılır.
            </p>
          </div>

          {/* Kaydet Butonu */}
          <div className="flex justify-end">
            <button 
              type="submit" 
              className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-105"
            >
              Verileri Güncelle ve Kaydet 💾
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}