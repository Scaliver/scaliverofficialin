import mlbbDiamonds from "@/assets/mlbb-hero.jpg";
import pubgUc from "@/assets/pubg-hero.jpeg";
import genshinGems from "@/assets/genshin-gems.png";
import starlightCard from "@/assets/starlight-hero.jpg";
import doubleDiamonds from "@/assets/double-diamonds.png";
import weeklyPass from "@/assets/weekly-hero.png";
import instagramService from "@/assets/instagram-hero.jpg";
import youtubeService from "@/assets/youtube-hero.jpg";
import hokTokens from "@/assets/hok-hero.jpg";
import bgmiUc from "@/assets/bgmi-hero.webp";

export interface PricingTier {
  id: string;
  amount: string;
  price: number;
  bonus?: string;
  smmServiceId?: string; // SMM Panel service ID for social media products
  quantity?: number;     // Quantity for SMM orders
}

export interface Product {
  id: string;
  name: string;
  image: string;
  inStock: boolean;
  category: string;
  description: string;
  pricingTiers: PricingTier[];
  instructions?: string[];
  isSocialMedia?: boolean; // Flag for social media products that use SMM API
}

export const mobileLegendsProducts: Product[] = [
  {
    id: "mlbb-small",
    name: "MLBB SMALL PACK",
    image: mlbbDiamonds,
    inStock: true,
    category: "Mobile Legends",
    description: "Get diamonds for Mobile Legends: Bang Bang at the best prices. Instant delivery to your account.",
    pricingTiers: [
      { id: "mlbb-small-1", amount: "3 Diamonds", price: 7 },
      { id: "mlbb-small-2", amount: "5 Diamonds", price: 9 },
      { id: "mlbb-small-3", amount: "11 Diamonds", price: 17 },
      { id: "mlbb-small-4", amount: "22 Diamonds", price: 35 },
      { id: "mlbb-small-5", amount: "55 Diamonds", price: 72, bonus: "Bonus" },
      { id: "mlbb-small-6", amount: "86 Diamonds", price: 115 },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select the diamond pack", "Complete payment", "Diamonds will be credited within 5-10 minutes"],
  },
  {
    id: "mlbb-mid",
    name: "MLBB MID PACK",
    image: mlbbDiamonds,
    inStock: true,
    category: "Mobile Legends",
    description: "Medium diamond packs for Mobile Legends at competitive rates. Fast and reliable service.",
    pricingTiers: [
      { id: "mlbb-mid-1", amount: "110 Diamonds", price: 140 },
      { id: "mlbb-mid-2", amount: "165 Diamonds", price: 212, bonus: "Bonus" },
      { id: "mlbb-mid-3", amount: "172 Diamonds", price: 220 },
      { id: "mlbb-mid-4", amount: "257 Diamonds", price: 317 },
      { id: "mlbb-mid-5", amount: "275 Diamonds", price: 335, bonus: "Bonus" },
      { id: "mlbb-mid-6", amount: "343 Diamonds", price: 430 },
      { id: "mlbb-mid-7", amount: "429 Diamonds", price: 535 },
      { id: "mlbb-mid-8", amount: "514 Diamonds", price: 640 },
      { id: "mlbb-mid-9", amount: "575 Diamonds", price: 680, bonus: "Bonus" },
      { id: "mlbb-mid-10", amount: "600 Diamonds", price: 755 },
      { id: "mlbb-mid-11", amount: "706 Diamonds", price: 860 },
      { id: "mlbb-mid-12", amount: "792 Diamonds", price: 980 },
      { id: "mlbb-mid-13", amount: "878 Diamonds", price: 1070 },
      { id: "mlbb-mid-14", amount: "963 Diamonds", price: 1190 },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select the diamond pack", "Complete payment", "Diamonds will be credited within 5-10 minutes"],
  },
  {
    id: "mlbb-large",
    name: "MLBB LARGE PACK",
    image: mlbbDiamonds,
    inStock: true,
    category: "Mobile Legends",
    description: "Large diamond packs for serious gamers. Best value for bulk purchases.",
    pricingTiers: [
      { id: "mlbb-large-1", amount: "1049 Diamonds", price: 1290 },
      { id: "mlbb-large-2", amount: "1130 Diamonds", price: 1355 },
      { id: "mlbb-large-3", amount: "1412 Diamonds", price: 1750 },
      { id: "mlbb-large-4", amount: "2195 Diamonds", price: 2645 },
      { id: "mlbb-large-5", amount: "3688 Diamonds", price: 4350 },
      { id: "mlbb-large-6", amount: "5532 Diamonds", price: 7100 },
      { id: "mlbb-large-7", amount: "9288 Diamonds", price: 10820 },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select the diamond pack", "Complete payment", "Diamonds will be credited within 5-10 minutes"],
  },
  {
    id: "weekly-pass",
    name: "WEEKLY DIAMOND PASS",
    image: weeklyPass,
    inStock: true,
    category: "Mobile Legends",
    description: "Weekly pass that gives you daily diamonds for 7 days.",
    pricingTiers: [
      { id: "weekly-1", amount: "Weekly Diamond Pass", price: 135 },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select the weekly pass", "Complete payment", "Pass will be activated immediately"],
  },
  {
    id: "double-diamonds",
    name: "DOUBLE DIAMONDS GLOBAL",
    image: doubleDiamonds,
    inStock: true,
    category: "Mobile Legends",
    description: "Get double the diamonds! First-time recharge bonus for new accounts.",
    pricingTiers: [
      { id: "dd-1", amount: "50+5 Diamonds", price: 72, bonus: "Bonus" },
      { id: "dd-2", amount: "150+15 Diamonds", price: 212, bonus: "Bonus" },
      { id: "dd-3", amount: "250+25 Diamonds", price: 335, bonus: "Bonus" },
      { id: "dd-4", amount: "500+65 Diamonds", price: 670, bonus: "Bonus" },
    ],
    instructions: ["Only for first-time purchase on account", "Enter your User ID and Zone ID", "Select the pack", "Complete payment"],
  },
  {
    id: "starlight",
    name: "STARLIGHT CARD",
    image: starlightCard,
    inStock: true,
    category: "Mobile Legends",
    description: "Monthly Starlight membership with exclusive skins and rewards.",
    pricingTiers: [
      { id: "star-1", amount: "Starlight Member", price: 249 },
      { id: "star-2", amount: "Starlight Plus", price: 449 },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select Starlight type", "Complete payment", "Starlight will be activated within 10 minutes"],
  },
];

export const mobileGamesProducts: Product[] = [
  {
    id: "pubg-global",
    name: "PUBG GLOBAL",
    image: pubgUc,
    inStock: true,
    category: "Mobile Games",
    description: "Get UC for PUBG Mobile Global version at discounted rates.",
    pricingTiers: [
      { id: "pubg-1", amount: "60 UC", price: 75 },
      { id: "pubg-2", amount: "325 UC", price: 399 },
      { id: "pubg-3", amount: "660 UC", price: 799 },
      { id: "pubg-4", amount: "1800 UC", price: 1999 },
      { id: "pubg-5", amount: "3850 UC", price: 3999 },
      { id: "pubg-6", amount: "8100 UC", price: 7999 },
    ],
    instructions: ["Enter your Player ID", "Select the UC pack", "Complete payment", "UC will be credited within 5-10 minutes"],
  },
  {
    id: "bgmi",
    name: "BGMI (INDIA)",
    image: bgmiUc,
    inStock: true,
    category: "Mobile Games",
    description: "UC for Battlegrounds Mobile India at the best prices.",
    pricingTiers: [
      { id: "bgmi-1", amount: "60 UC", price: 79 },
      { id: "bgmi-2", amount: "325 UC", price: 419 },
      { id: "bgmi-3", amount: "660 UC", price: 829 },
      { id: "bgmi-4", amount: "1800 UC", price: 2099 },
      { id: "bgmi-5", amount: "3850 UC", price: 4199 },
    ],
    instructions: ["Enter your Character ID", "Select the UC pack", "Complete payment", "UC will be credited within 5-10 minutes"],
  },
  {
    id: "genshin",
    name: "GENSHIN IMPACT GLOBAL",
    image: genshinGems,
    inStock: true,
    category: "Mobile Games",
    description: "Genesis Crystals for Genshin Impact at competitive prices.",
    pricingTiers: [
      { id: "genshin-1", amount: "60 Genesis Crystals", price: 89 },
      { id: "genshin-2", amount: "300 Genesis Crystals", price: 449 },
      { id: "genshin-3", amount: "980 Genesis Crystals", price: 1399 },
      { id: "genshin-4", amount: "1980 Genesis Crystals", price: 2799 },
      { id: "genshin-5", amount: "3280 Genesis Crystals", price: 4599 },
      { id: "genshin-6", amount: "6480 Genesis Crystals", price: 8999 },
    ],
    instructions: ["Enter your UID", "Select server region", "Select the crystal pack", "Complete payment", "Crystals will be credited within 10-15 minutes"],
  },
  {
    id: "hok",
    name: "HONOUR OF KINGS",
    image: hokTokens,
    inStock: true,
    category: "Mobile Games",
    description: "Tokens for Honor of Kings at the best rates.",
    pricingTiers: [
      { id: "hok-1", amount: "60 Tokens", price: 85 },
      { id: "hok-2", amount: "300 Tokens", price: 399 },
      { id: "hok-3", amount: "600 Tokens", price: 779 },
      { id: "hok-4", amount: "1500 Tokens", price: 1899 },
    ],
    instructions: ["Enter your Player ID", "Select the token pack", "Complete payment", "Tokens will be credited within 5-10 minutes"],
  },
];

export const socialMediaProducts: Product[] = [
  {
    id: "instagram",
    name: "INSTAGRAM SERVICE",
    image: instagramService,
    inStock: true,
    category: "Social Media",
    description: "Boost your Instagram presence with followers, likes, and engagement.",
    isSocialMedia: true,
    pricingTiers: [
      // Update these smmServiceId values with your actual SMM panel service IDs
      { id: "ig-1", amount: "1000 Followers", price: 199, smmServiceId: "1", quantity: 1000 },
      { id: "ig-2", amount: "5000 Followers", price: 899, smmServiceId: "1", quantity: 5000 },
      { id: "ig-3", amount: "10000 Followers", price: 1699, smmServiceId: "1", quantity: 10000 },
      { id: "ig-0", amount: "10 Likes", price: 1, smmServiceId: "1767", quantity: 10 },
      { id: "ig-4", amount: "1000 Likes", price: 5, smmServiceId: "1767", quantity: 1000 },
      { id: "ig-5", amount: "2000 Likes", price: 10, smmServiceId: "1767", quantity: 2000 },
      { id: "ig-6", amount: "3000 Likes", price: 15, smmServiceId: "1767", quantity: 3000 },
      { id: "ig-7", amount: "4000 Likes", price: 20, smmServiceId: "1767", quantity: 4000 },
      { id: "ig-8", amount: "5000 Likes", price: 25, smmServiceId: "1767", quantity: 5000 },
      { id: "ig-9", amount: "6000 Likes", price: 30, smmServiceId: "1767", quantity: 6000 },
      { id: "ig-10", amount: "7000 Likes", price: 35, smmServiceId: "1767", quantity: 7000 },
      { id: "ig-11", amount: "8000 Likes", price: 40, smmServiceId: "1767", quantity: 8000 },
      { id: "ig-12", amount: "9000 Likes", price: 45, smmServiceId: "1767", quantity: 9000 },
      { id: "ig-13", amount: "10000 Likes", price: 50, smmServiceId: "1767", quantity: 10000 },
    ],
    instructions: ["Enter your Instagram username or post URL", "Make sure your account is public", "Select the service", "Complete payment", "Service will be delivered within 24-48 hours"],
  },
  {
    id: "youtube",
    name: "YOUTUBE SERVICE",
    image: youtubeService,
    inStock: true,
    category: "Social Media",
    description: "Grow your YouTube channel with subscribers and views.",
    isSocialMedia: true,
    pricingTiers: [
      // Update these smmServiceId values with your actual SMM panel service IDs
      { id: "yt-1", amount: "1000 Subscribers", price: 499, smmServiceId: "3", quantity: 1000 },
      { id: "yt-2", amount: "5000 Subscribers", price: 2299, smmServiceId: "3", quantity: 5000 },
      { id: "yt-3", amount: "1000 Views", price: 99, smmServiceId: "4", quantity: 1000 },
      { id: "yt-4", amount: "10000 Views", price: 899, smmServiceId: "4", quantity: 10000 },
      { id: "yt-5", amount: "100000 Views", price: 7999, smmServiceId: "4", quantity: 100000 },
    ],
    instructions: ["Enter your YouTube channel or video URL", "Select the service", "Complete payment", "Service will be delivered within 24-72 hours"],
  },
];

// Helper function to get all products
export const getAllProducts = (): Product[] => {
  return [...mobileLegendsProducts, ...mobileGamesProducts, ...socialMediaProducts];
};

// Helper function to find product by ID
export const getProductById = (id: string): Product | undefined => {
  return getAllProducts().find(product => product.id === id);
};
