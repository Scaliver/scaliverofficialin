import mlbbDiamonds from "@/assets/mlbb-diamonds.png";
import pubgUc from "@/assets/pubg-uc.png";
import genshinGems from "@/assets/genshin-gems.png";
import starlightCard from "@/assets/starlight-card.png";
import doubleDiamonds from "@/assets/double-diamonds.png";
import weeklyPass from "@/assets/weekly-pass.png";
import instagramService from "@/assets/instagram-service.png";
import youtubeService from "@/assets/youtube-service.png";
import hokTokens from "@/assets/hok-tokens.png";
import bgmiUc from "@/assets/bgmi-uc.png";

export interface PricingTier {
  id: string;
  amount: string;
  price: number;
  bonus?: string;
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
      { id: "mlbb-small-1", amount: "86 Diamonds", price: 79 },
      { id: "mlbb-small-2", amount: "172 Diamonds", price: 149 },
      { id: "mlbb-small-3", amount: "257 Diamonds", price: 219 },
      { id: "mlbb-small-4", amount: "344 Diamonds", price: 289 },
      { id: "mlbb-small-5", amount: "429 Diamonds", price: 359 },
      { id: "mlbb-small-6", amount: "514 Diamonds", price: 429 },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select the diamond pack", "Complete payment", "Diamonds will be credited within 5-10 minutes"],
  },
  {
    id: "mlbb-global",
    name: "MLBB GLOBAL",
    image: mlbbDiamonds,
    inStock: true,
    category: "Mobile Legends",
    description: "Global Mobile Legends diamonds at competitive rates. Fast and reliable service.",
    pricingTiers: [
      { id: "mlbb-global-1", amount: "100 Diamonds", price: 85 },
      { id: "mlbb-global-2", amount: "250 Diamonds", price: 199 },
      { id: "mlbb-global-3", amount: "500 Diamonds", price: 389 },
      { id: "mlbb-global-4", amount: "1000 Diamonds", price: 759 },
      { id: "mlbb-global-5", amount: "2000 Diamonds", price: 1499 },
      { id: "mlbb-global-6", amount: "5000 Diamonds", price: 3699 },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select the diamond pack", "Complete payment", "Diamonds will be credited within 5-10 minutes"],
  },
  {
    id: "mlbb-event",
    name: "MLBB EVENT PACK",
    image: mlbbDiamonds,
    inStock: true,
    category: "Mobile Legends",
    description: "Special event packs with bonus diamonds. Limited time offers!",
    pricingTiers: [
      { id: "mlbb-event-1", amount: "110 Diamonds", price: 89, bonus: "+10 Bonus" },
      { id: "mlbb-event-2", amount: "275 Diamonds", price: 209, bonus: "+25 Bonus" },
      { id: "mlbb-event-3", amount: "550 Diamonds", price: 409, bonus: "+50 Bonus" },
      { id: "mlbb-event-4", amount: "1100 Diamonds", price: 799, bonus: "+100 Bonus" },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select the event pack", "Complete payment", "Diamonds will be credited within 5-10 minutes"],
  },
  {
    id: "double-diamonds",
    name: "DOUBLE DIAMONDS GLOBAL",
    image: doubleDiamonds,
    inStock: true,
    category: "Mobile Legends",
    description: "Get double the diamonds! First-time recharge bonus for new accounts.",
    pricingTiers: [
      { id: "dd-1", amount: "200 Diamonds", price: 169, bonus: "2x First Time" },
      { id: "dd-2", amount: "500 Diamonds", price: 399, bonus: "2x First Time" },
      { id: "dd-3", amount: "1000 Diamonds", price: 789, bonus: "2x First Time" },
      { id: "dd-4", amount: "2000 Diamonds", price: 1549, bonus: "2x First Time" },
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
  {
    id: "weekly-pass",
    name: "WEEKLY DIAMOND PASS",
    image: weeklyPass,
    inStock: true,
    category: "Mobile Legends",
    description: "Weekly pass that gives you daily diamonds for 7 days.",
    pricingTiers: [
      { id: "weekly-1", amount: "Weekly Pass (50 Diamonds/day)", price: 149 },
      { id: "weekly-2", amount: "Weekly Pass x2", price: 279 },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select the weekly pass", "Complete payment", "Pass will be activated immediately"],
  },
  {
    id: "mlbb-singapore",
    name: "MLBB SINGAPORE",
    image: mlbbDiamonds,
    inStock: true,
    category: "Mobile Legends",
    description: "Diamonds for Mobile Legends Singapore server.",
    pricingTiers: [
      { id: "sg-1", amount: "100 Diamonds", price: 95 },
      { id: "sg-2", amount: "250 Diamonds", price: 225 },
      { id: "sg-3", amount: "500 Diamonds", price: 439 },
      { id: "sg-4", amount: "1000 Diamonds", price: 859 },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select the diamond pack", "Complete payment", "Diamonds will be credited within 5-10 minutes"],
  },
  {
    id: "mlbb-philippines",
    name: "MLBB PHILIPPINES",
    image: mlbbDiamonds,
    inStock: true,
    category: "Mobile Legends",
    description: "Diamonds for Mobile Legends Philippines server.",
    pricingTiers: [
      { id: "ph-1", amount: "100 Diamonds", price: 89 },
      { id: "ph-2", amount: "250 Diamonds", price: 215 },
      { id: "ph-3", amount: "500 Diamonds", price: 419 },
      { id: "ph-4", amount: "1000 Diamonds", price: 819 },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select the diamond pack", "Complete payment", "Diamonds will be credited within 5-10 minutes"],
  },
  {
    id: "mlbb-malaysia",
    name: "MLBB MALAYSIA",
    image: mlbbDiamonds,
    inStock: true,
    category: "Mobile Legends",
    description: "Diamonds for Mobile Legends Malaysia server.",
    pricingTiers: [
      { id: "my-1", amount: "100 Diamonds", price: 92 },
      { id: "my-2", amount: "250 Diamonds", price: 220 },
      { id: "my-3", amount: "500 Diamonds", price: 429 },
      { id: "my-4", amount: "1000 Diamonds", price: 839 },
    ],
    instructions: ["Enter your User ID and Zone ID", "Select the diamond pack", "Complete payment", "Diamonds will be credited within 5-10 minutes"],
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
    pricingTiers: [
      { id: "ig-1", amount: "1000 Followers", price: 199 },
      { id: "ig-2", amount: "5000 Followers", price: 899 },
      { id: "ig-3", amount: "10000 Followers", price: 1699 },
      { id: "ig-4", amount: "1000 Likes", price: 99 },
      { id: "ig-5", amount: "5000 Likes", price: 449 },
    ],
    instructions: ["Enter your Instagram username", "Make sure your account is public", "Select the service", "Complete payment", "Service will be delivered within 24-48 hours"],
  },
  {
    id: "youtube",
    name: "YOUTUBE SERVICE",
    image: youtubeService,
    inStock: true,
    category: "Social Media",
    description: "Grow your YouTube channel with subscribers and views.",
    pricingTiers: [
      { id: "yt-1", amount: "1000 Subscribers", price: 499 },
      { id: "yt-2", amount: "5000 Subscribers", price: 2299 },
      { id: "yt-3", amount: "1000 Views", price: 99 },
      { id: "yt-4", amount: "10000 Views", price: 899 },
      { id: "yt-5", amount: "100000 Views", price: 7999 },
    ],
    instructions: ["Enter your YouTube channel URL", "Select the service", "Complete payment", "Service will be delivered within 24-72 hours"],
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
