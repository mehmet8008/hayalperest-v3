import { getDb } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

// Next.js 15 uyumlu params tipi
export default async function PublicProfilePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  
  // Parametreyi çözüyoruz (Next.js 15+ için await şart)
  const { id } = await params;
  const db = getDb();

  // 1. Vatandaşı Bul
  const [userRows]: any = await db.query(
    'SELECT id, username, title, bio, coins, gender, height, weight FROM users WHERE id = ?', 
    [id]
  );
  const user = userRows[0];

  if (!user) {
    return notFound();
  }

  // 2. Vitrini Çek
  const [inventory]: any = await db.query(`
    SELECT p.name, p.category, p.image_url, p.item_type 
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    WHERE i.clerk_id = (SELECT clerk_id FROM users WHERE id = ?)
    ORDER BY i.purchased_at DESC
  `, [id]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard/community" className="inline-block mb-8 text-slate-500 hover:text-white transition-colors">
          ← Topluluğa Dön
        </Link>

        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8 mb-8 relative overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start relative z-10">
                <div className="w-24 h-24 rounded-full bg-slate-700 border-4 border-slate-800 flex items-center justify-center text-4xl shadow-xl">
                    {user.gender === 'female' ? '👩' : '👨'}
                </div>
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-3xl font-bold text-white">{user.username}</h1>
                    <div className="text-cyan-400 font-medium mb-2">{user.title || "Gezgin"}</div>
                    <p className="text-slate-300 italic max-w-lg">"{user.bio || 'Gizemli bir vatandaş...'}"</p>
                    <div className="flex gap-4 justify-center md:justify-start mt-4 text-xs text-slate-500 font-mono">
                        {user.height && <span>BOY: {user.height}cm</span>}
                        {user.weight && <span>AĞIRLIK: {user.weight}kg</span>}
                        <span>ID: #{user.id}</span>
                    </div>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-700/50 text-center min-w-[120px]">
                    <div className="text-xs text-slate-500 uppercase mb-1">VARLIK</div>
                    <div className="text-xl font-bold text-yellow-400">{user.coins} HP</div>
                </div>
            </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            🎒 Vitrin <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{inventory.length}</span>
        </h2>

        {inventory.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-800 text-slate-500">
                Vitrin boş.
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {inventory.map((item: any, idx: number) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col items-center text-center">
                        <div className="text-3xl mb-2">{item.category === 'Aksesuar' ? '👓' : item.category === 'Giyim' ? '🧥' : '📦'}</div>
                        <div className="text-sm font-bold text-white line-clamp-1">{item.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{item.item_type}</div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}