import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HayalPerest Metaverse',
    short_name: 'HayalPerest',
    description: 'Fiziksel ve Dijital Evrenin Birleştiği Nokta',
    start_url: '/',
    display: 'standalone', // Bu sihirli kod tarayıcı çubuğunu yok eder
    background_color: '#020617', // Arka plan (Slate-950 rengi)
    theme_color: '#020617', // Üst bar rengi
    icons: [
      {
        src: '/favicon.ico', // Şimdilik varsayılan ikonu kullanıyoruz
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}