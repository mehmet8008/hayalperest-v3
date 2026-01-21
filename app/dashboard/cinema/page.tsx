import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import Link from "next/link";

export default async function CinemaPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  let videos: any[] = [];
  let errorMsg = null;

  // --- GÜVENLİ VERİ ÇEKME ---
  try {
    const db = getDb();
    // Sorguyu çalıştır
    const [rows]: any = await db.query('SELECT * FROM videos ORDER BY created_at DESC');
    
    // Gelen veri dizi mi kontrol et
    if (Array.isArray(rows)) {
      videos = rows;
    }
  } catch (err) {
    console.error("SİNEMA HATASI:", err); // Terminale hatayı basar
    errorMsg = "Sinema salonuna bağlanırken teknik bir sorun oluştu.";
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Başlık */}
        <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-6">
           <div className="flex items-center gap-4">
             <Link href="/dashboard" className="p-2 rounded-full bg-gray-900 hover:bg-gray-800 transition-colors">⬅</Link>
             <div>
               <h1 className="text-3xl font-bold text-red-600 tracking-widest">HAYALPEREST <span className="text-white">CINEMA</span></h1>
               <p className="text-gray-500 text-sm">Vizyondaki İçerikler</p>
             </div>
           </div>
           
           <div className="bg-red-900/20 text-red-500 px-4 py-2 rounded-full text-xs font-bold border border-red-900/50">
             ● CANLI
           </div>
        </div>

        {/* HATA DURUMU */}
        {errorMsg && (
          <div className="bg-red-900/20 border border-red-800 p-6 rounded-xl text-center mb-8">
            <h3 className="text-xl font-bold text-red-500">⚠️ Bağlantı Hatası</h3>
            <p className="text-gray-400">{errorMsg}</p>
            <p className="text-xs text-gray-600 mt-2">Terminali kontrol et.</p>
          </div>
        )}

        {/* İÇERİK YOKSA */}
        {!errorMsg && videos.length === 0 && (
          <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
             <div className="text-6xl mb-4 opacity-50">🎬</div>
             <h2 className="text-xl font-bold text-gray-300">Henüz Video Yüklenmedi</h2>
             <p className="text-gray-500">Yönetim vizyona yeni filmler ekleyene kadar beklemede kal.</p>
          </div>
        )}

        {/* VİDEOLAR VARSA */}
        {videos.length > 0 && (
          <>
            {/* Ana Sahne (En yeni video) */}
            <div className="mb-12">
               <div className="aspect-video w-full bg-gray-900 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.3)] border border-gray-800">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`${videos[0].video_url}?autoplay=0&rel=0`} 
                    title="Featured Video" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
               </div>
               <div className="mt-4">
                  <h2 className="text-2xl font-bold text-white">{videos[0].title}</h2>
                  <p className="text-gray-400 mt-2 max-w-2xl">{videos[0].description}</p>
               </div>
            </div>

            {/* Diğerleri */}
            <h3 className="text-xl font-bold text-white mb-6 pl-2 border-l-4 border-red-600">Diğer İçerikler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.slice(1).map((video: any) => (
                <div key={video.id} className="group bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-red-600/50 transition-all cursor-pointer">
                   <div className="aspect-video relative">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src={video.video_url} 
                        title={video.title}
                        frameBorder="0" 
                        allowFullScreen
                        className="pointer-events-none group-hover:pointer-events-auto"
                      ></iframe>
                   </div>
                   <div className="p-4">
                      <div className="text-[10px] text-red-500 font-bold uppercase mb-1">{video.category}</div>
                      <h4 className="font-bold text-white mb-2 line-clamp-1">{video.title}</h4>
                   </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}