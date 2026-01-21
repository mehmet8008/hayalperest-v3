import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// --- SERVER ACTION: MESAJ GÖNDER ---
async function postMessage(formData: FormData) {
  "use server";
  const { userId } = await auth();
  if (!userId) return;

  const content = formData.get("content") as string;
  if (!content || content.trim() === "") return;

  const db = getDb();
  
  // Önce kullanıcının veritabanındaki ID'sini bul
  const [userRows]: any = await db.query('SELECT id FROM users WHERE clerk_id = ?', [userId]);
  const dbUser = userRows[0];

  if (dbUser) {
    await db.query(
      'INSERT INTO messages (user_id, content) VALUES (?, ?)',
      [dbUser.id, content]
    );
    revalidatePath("/dashboard/community");
  }
}

export default async function CommunityPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const db = getDb();

  // 1. Kullanıcıları Çek
  const [users]: any = await db.query(`
    SELECT id, username, title, bio, coins 
    FROM users 
    ORDER BY coins DESC
  `);

  // 2. Mesajları Çek (En yeniden eskiye)
  // Yazanın adını ve unvanını da çekiyoruz (JOIN işlemi)
  const [messages]: any = await db.query(`
    SELECT m.id, m.content, m.created_at, u.username, u.title, u.image_url, u.equipped_badge, u.id as sender_id
    FROM messages m
    JOIN users u ON m.user_id = u.id
    ORDER BY m.created_at DESC
    LIMIT 50
  `);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Başlık ve Navigasyon */}
        <div className="flex items-center gap-4 mb-8">
           <Link href="/dashboard" className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 transition-colors border border-slate-700">⬅</Link>
           <div>
             <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
               Meydan 🌍
             </h1>
             <p className="text-slate-400 text-sm">Vatandaşların buluşma noktası.</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- SOL TARA: SOHBET DUVARI (YENİ) --- */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Mesaj Yazma Kutusu */}
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl backdrop-blur-sm sticky top-4 z-10 shadow-lg">
                    <form action={postMessage} className="flex gap-2">
                        <input 
                            name="content" 
                            placeholder="Evrene bir mesaj bırak..." 
                            maxLength={280}
                            required
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                        />
                        <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg transition-colors">
                            YAZ 📢
                        </button>
                    </form>
                </div>

                {/* Mesaj Listesi */}
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 italic">Henüz kimse konuşmadı. Sessizliği sen boz!</div>
                    ) : (
                        messages.map((msg: any) => (
                            <div key={msg.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Profil Resmi */}
<div className="flex-shrink-0">
    {msg.image_url ? (
        <img 
            src={msg.image_url} 
            alt={msg.username} 
            className="w-10 h-10 rounded-full border border-slate-700 object-cover"
        />
    ) : (
        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">
            👤
        </div>
    )}
</div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-white text-sm">{msg.username}</span>
                                        <span className="text-[10px] bg-slate-800 text-cyan-400 px-1.5 rounded">{msg.title || 'Gezgin'}</span>
                                        {/* Kuşanılan Eşya Rozeti */}
{msg.equipped_badge && (
    <span className="text-[10px] bg-blue-900/30 text-blue-400 border border-blue-500/30 px-1.5 rounded flex items-center gap-1">
        {msg.equipped_badge}
    </span>
)}
                                        <span className="text-[10px] text-slate-600">
                                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 text-sm">{msg.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- SAĞ TARAF: NÜFUS LİSTESİ (ESKİ KARTLAR) --- */}
            <div className="lg:col-span-1">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    🎖️ Liderler
                </h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {users.map((citizen: any, index: number) => (
                        <Link href={`/profile/${citizen.id}`} key={citizen.id} className="block group">
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-blue-500/50 transition-all flex items-center gap-3">
                                <div className="font-mono text-slate-500 w-4">{index + 1}.</div>
                                <div className="flex-1">
                                    <div className="font-bold text-white text-sm group-hover:text-blue-400">{citizen.username}</div>
                                    <div className="text-xs text-slate-500">{citizen.coins} HP</div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

        </div>

      </div>
    </div>
  );
}