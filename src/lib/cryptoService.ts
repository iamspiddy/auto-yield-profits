// Crypto price utilities
export interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  lastUpdated: Date;
}

// Cache for crypto prices to avoid excessive API calls
const cryptoPriceCache = new Map<string, { price: CryptoPrice; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchCryptoPrice(symbol: string): Promise<CryptoPrice | null> {
  const cacheKey = symbol.toUpperCase();
  const cached = cryptoPriceCache.get(cacheKey);
  
  // Return cached price if it's still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }

  try {
    // Using CoinGecko API (free tier, no API key required)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd&include_24hr_change=true`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${symbol} price`);
    }
    
    const data = await response.json();
    const coinData = data[symbol.toLowerCase()];
    
    if (!coinData) {
      throw new Error(`No data found for ${symbol}`);
    }
    
    const price: CryptoPrice = {
      symbol: symbol.toUpperCase(),
      price: coinData.usd,
      change24h: coinData.usd_24h_change || 0,
      lastUpdated: new Date()
    };
    
    // Cache the price
    cryptoPriceCache.set(cacheKey, { price, timestamp: Date.now() });
    
    return price;
  } catch (error) {
    console.error(`Error fetching ${symbol} price:`, error);
    return null;
  }
}

export function convertUSDToBTC(usdAmount: number, btcPrice: number): number {
  return usdAmount / btcPrice;
}

export function formatBTCAmount(btcAmount: number): string {
  if (btcAmount < 0.001) {
    return btcAmount.toFixed(8);
  } else if (btcAmount < 1) {
    return btcAmount.toFixed(6);
  } else {
    return btcAmount.toFixed(4);
  }
}
