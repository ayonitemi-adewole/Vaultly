
const BASE_URL = 'https://api.coingecko.com/api/v3';

export const getCoinPrices = async (coinIds: string[]) => {
  if (!coinIds.length) return {};
  try {
    const ids = coinIds.join(',');
    const response = await fetch(
      `${BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );

    if (!response.ok) throw new Error('Failed to fetch coin prices');

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching coin prices:', error);
    return {};
  }
};

export const getCoinDetails = async (coinId: string) => {
  if (!coinId) return null;
  try {
    const response = await fetch(
      `${BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
    );

    if (!response.ok) throw new Error(`Failed to fetch details for ${coinId}`);

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      symbol: data.symbol.toUpperCase(),
      image: data.image?.large,
      price: data.market_data?.current_price?.usd,
      marketCap: data.market_data?.market_cap?.usd,
      change24h: data.market_data?.price_change_percentage_24h,
      high24h: data.market_data?.high_24h?.usd,
      low24h: data.market_data?.low_24h?.usd,
    };
  } catch (error) {
    console.error('Error fetching coin details:', error);
    return null;
  }
};

export const getCustomDayPrice = async (coinId: string, customDate: any) => {
  if (!coinId) return null;
  try {
    const response = await fetch(
      `${BASE_URL}/coins/${coinId}/history?date=${customDate}&localization=false`
    );
    if (!response.ok) throw new Error('Failed to fetch previous day price');
    const data = await response.json();
    return data.market_data?.current_price?.usd || null;
  } catch (error) {
    console.error('Error fetching previous day price:', error);
    return null;
  };
}

export const searchCoins = async (query: string) => {
  if (!query) return [];
  try {
    const response = await fetch(`${BASE_URL}/search?query=${query}`);
    if (!response.ok) throw new Error('Failed to search coins');

    const data = await response.json();
    return data.coins.map((coin: any) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      thumb: coin.thumb,
      market_cap_rank: coin.market_cap_rank,
    }));
  } catch (error) {
    console.error('Error searching coins:', error);
    return [];
  }
};


export const getGlobalMarketData = async () => {
  try {
    const response = await fetch(`${BASE_URL}/global`);
    if (!response.ok) throw new Error('Failed to fetch global market data');

    const data = await response.json();
    return {
      totalMarketCap: data.data.total_market_cap.usd,
      totalVolume: data.data.total_volume.usd,
      btcDominance: data.data.market_cap_percentage.btc,
      ethDominance: data.data.market_cap_percentage.eth,
    };
  } catch (error) {
    console.error('Error fetching global market data:', error);
    return null;
  }
};

export const getCoinMarketChart = async (
  coinId: string,
  days: number | string = 7
) => {
  if (!coinId) return [];
  try {
    const response = await fetch(
      `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
    );

    if (!response.ok)
      throw new Error(`Failed to fetch market chart for ${coinId}`);

    const data = await response.json();
    return data.prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toISOString().split('T')[0],
      price,
    }));
  } catch (error) {
    console.error('Error fetching coin market chart:', error);
    return [];
  }
};

export const getCoinHistoricalPrice = async (coinId: string, date: string) => {
  if (!coinId || !date) return null;
  try {
    const response = await fetch(
      `${BASE_URL}/coins/${coinId}/history?date=${date}&localization=false`
    );
    if (!response.ok) throw new Error('Failed to fetch historical price');

    const data = await response.json();
    return data.market_data?.current_price?.usd || null;
  } catch (error) {
    console.error('Error fetching historical price:', error);
    return null;
  }
};
