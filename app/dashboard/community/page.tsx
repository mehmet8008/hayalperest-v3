import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import Link from "next/link";

export default async function CommunityPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const db = getDb();

  // Tüm kullanıcıları çek (Kendin hariç herkesi görmek istersen WHERE ekleriz ama şimdilik herkesi görelim)
  const [users]: any = await db.query(`
    SELECT id, username, title, bio, coins, created_at 
    FROM users 
    ORDER BY coins DESC
  `);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Başlık */}
        <div className="flex items-center gap-4 mb-8">
           <Link href="/dashboard" className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 transition-colors">⬅</Link>
           <div>
             <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
               HayalPerest Nüfusu 🌍
             </h1>
             <p className="text-slate-400">Bu evrende yaşayan dijital vatandaşlar.</p>
           </div>
        </div>

        {/* Kullanıcı Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((citizen: any, index: number) => (
            <div key={citizen.id} className="relative group bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 transition-all hover:-translate-y-1">
               
               {/* Sıralama Rozeti (En zengin 3 kişi için) */}
               {index === 0 && <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-bl-lg">🥇 Lider</div>}
               {index === 1 && <div className="absolute top-0 right-0 bg-slate-400 text-black text-xs font-bold px-2 py-1 rounded-bl-lg">🥈 İkinci</div>}
               {index === 2 && <div className="absolute top-0 right-0 bg-orange-700 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">🥉 Üçüncü</div>}

               <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl border border-slate-700">
                    👤
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{citizen.username || "İsimsiz Vatandaş"}</h3>
                    <div className="text-xs text-cyan-400">{citizen.title || "Gezgin"}</div>
                  </div>
               </div>

               <p className="text-slate-400 text-sm mb-4 line-clamp-2 italic">
                 "{citizen.bio || 'Henüz bir biyografi yazmadı.'}"
               </p>

               <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-800 pt-4">
                  <span>Varlık: <span className="text-green-400 font-mono">{citizen.coins} HP</span></span>
                  <Link href={`/profile/${citizen.id}`} className="text-blue-400 hover:text-white transition-colors">
                    Profili İncele →
                  </Link>
               </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}