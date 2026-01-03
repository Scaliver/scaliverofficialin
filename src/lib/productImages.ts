// Product image mapping - converts database paths to imported modules
import mlbbHero from '@/assets/mlbb-hero.jpg';
import weeklyHero from '@/assets/weekly-hero.png';
import doubleDiamonds from '@/assets/double-diamonds.png';
import starlightHero from '@/assets/starlight-hero.jpg';
import pubgHero from '@/assets/pubg-hero.jpeg';
import bgmiHero from '@/assets/bgmi-hero.webp';
import genshinGems from '@/assets/genshin-gems.png';
import hokHero from '@/assets/hok-hero.jpg';
import instagramHero from '@/assets/instagram-hero.jpg';
import youtubeHero from '@/assets/youtube-hero.jpg';
import facebookLogo from '@/assets/facebook-logo.jpeg';
import tiktokLogo from '@/assets/tiktok-logo.jpeg';

// Map database paths to imported images
const imageMap: Record<string, string> = {
  '/src/assets/mlbb-hero.jpg': mlbbHero,
  '/src/assets/weekly-hero.png': weeklyHero,
  '/src/assets/double-diamonds.png': doubleDiamonds,
  '/src/assets/starlight-hero.jpg': starlightHero,
  '/src/assets/pubg-hero.jpeg': pubgHero,
  '/src/assets/bgmi-hero.webp': bgmiHero,
  '/src/assets/genshin-gems.png': genshinGems,
  '/src/assets/hok-hero.jpg': hokHero,
  '/src/assets/instagram-hero.jpg': instagramHero,
  '/src/assets/youtube-hero.jpg': youtubeHero,
  '/src/assets/facebook-logo.jpeg': facebookLogo,
  '/src/assets/tiktok-logo.jpeg': tiktokLogo,
};

/**
 * Converts a database image path to a proper Vite-bundled image URL
 * Falls back to the original URL if no mapping exists (for external URLs)
 */
export const getProductImage = (dbPath: string | null): string => {
  if (!dbPath) return '';
  
  // Check if it's a mapped local asset
  if (imageMap[dbPath]) {
    return imageMap[dbPath];
  }
  
  // Return as-is for external URLs (Supabase storage, etc.)
  return dbPath;
};
