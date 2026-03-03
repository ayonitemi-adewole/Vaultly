import { useState, useEffect } from 'react';
import AppSidebar from '@/components/shared/app-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, RefreshCw, Search, XCircle, CheckCircle2 } from 'lucide-react';
import {
  deleteFromPortfolio,
  getUserPortfolio,
  logTransaction,
  savePortfolioSnapshot,
  getPortfolioHistory,
} from '@/services/portfolio';
import { getCoinPrices } from '@/services/coingecko';
import { calculateProfit } from '@/utils/calculateProfits';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PortfolioAsset {
  id: string;
  coinId: string;
  name: string;
  symbol?: string;
  amount: number;
  totalAmount?: number;
  buyPrice: number;
}

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [prices, setPrices] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>(
    []
  );
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch portfolio and prices
  const fetchPortfolio = async () => {
    setIsLoading(true);
    try {
      const userPortfolio = (await getUserPortfolio()) as PortfolioAsset[];
      setPortfolio(userPortfolio);
      console.log('User Portfolio:', userPortfolio);

      const coinIds = userPortfolio.map((item) => item.coinId);
      console.log('Fetching prices for coin IDs:', coinIds);
      if (coinIds.length > 0) {
        const priceData = await getCoinPrices(coinIds);
        setPrices(priceData);

        // Save portfolio snapshot to Firebase for historical data
        await savePortfolioSnapshot(userPortfolio, priceData);
      }

      // Fetch historical data from Firebase for the chart
      let historyData = await getPortfolioHistory(7);

      // If no historical data exists (new user), create initial data point with today's value
      if (historyData.every((d) => d.value === 0)) {

        console.log('userportfolio for initial chart data:', userPortfolio);
        const todayValue = userPortfolio.reduce((sum, asset) => {
          const price = prices[asset.coinId]?.usd || asset.buyPrice || 0;
          return sum + price * (asset.totalAmount || 0);
        }, 0);

        const today = new Date().toISOString().split('T')[0];
        historyData = [{ date: today, value: todayValue }];
      }

      setChartData(historyData);
    } catch (err) {
      console.error(err);
      setError('Failed to load portfolio.');
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  };

  // Build chart data (now using real Firebase data)
  // This function is kept for backwards compatibility but chart data
  // is now fetched directly from Firebase in fetchPortfolio
  // const buildChart = (userPortfolio: any[]) => {
  // Chart data is now fetched from Firebase in fetchPortfolio
  // This function is kept for potential future use with live calculations
  //   console.log('Portfolio data for calculations:', userPortfolio);
  // };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // Remove asset
  const handleSell = async (
    id: string,
    currentValue: number,
    currentPrice: number,
    coinId: string,
    amount: number
  ) => {
    try {
      await deleteFromPortfolio(id, currentValue);

      // Log the transaction
      await logTransaction(
        {
          coinId: coinId,
          type: 'sell',
          amount: amount,
          price: currentPrice,
          totalSpent: currentValue,
        },
        lastUpdated.toISOString().split('T')[0]
      );

      setSuccess(true);
      fetchPortfolio();
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setError('Failed to remove asset.');
    }
  };

  // Filtered portfolio
  const filteredPortfolio = portfolio.filter((asset) => {
    // only keep assets whose name or symbol match the search term
    const term = search.toLowerCase();
    const matchesSearch =
      asset.name.toLowerCase().includes(term) ||
      asset.symbol?.toLowerCase().includes(term);
    console.log('Filtering asset:', asset, 'matches search:', matchesSearch);
    return matchesSearch;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />
      <main className="ml-64 p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
          <div className="flex gap-2">
            <Link to="/add-assets">
              <Button className="bg-gray-900 hover:bg-gray-800 gap-2">
                <Plus className="size-4" />
                Add Asset
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={fetchPortfolio}>
              <RefreshCw
                className={`size-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </header>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="size-5 text-green-600" />
            <span className="text-green-700 font-medium">
              Asset removed successfully!
            </span>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <XCircle className="size-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Search */}
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Portfolio Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Portfolio Value (7d)
          </h2>
          {chartData.length === 0 ? (
            <p className="text-gray-400 text-sm">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="colorPortfolio"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis
                  tickFormatter={(v) => `$${v.toLocaleString()}`}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip
                  formatter={(v?: number) => [
                    `$${typeof v === 'number' ? v.toFixed(2) : '0.00'}`,
                    'Value',
                  ]}
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0ea5e9"
                  fill="url(#colorPortfolio)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Assets Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Your Assets</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit/Loss
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading portfolio...
                    </td>
                  </tr>
                ) : filteredPortfolio.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No assets found.
                    </td>
                  </tr>
                ) : (
                  filteredPortfolio.map((asset: PortfolioAsset) => {
                    const currentPrice = prices[asset.coinId]?.usd || 0;
                    const { currentValue, profit, profitPercent } =
                      calculateProfit(
                        asset.totalAmount || asset.amount,
                        asset.buyPrice,
                        currentPrice
                      );

                    return (
                      <tr
                        key={asset.coinId}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {asset.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                          {formatCurrency(currentPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                          {asset.totalAmount || asset.amount}{' '}
                          {asset.symbol?.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(currentValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <span
                            className={
                              profit >= 0
                                ? 'text-green-500 font-medium'
                                : 'text-red-500 font-medium'
                            }
                          >
                            {profit >= 0 ? '+' : ''}
                            {profit.toFixed(2)} ({profitPercent.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm flex justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() =>
                              handleSell(
                                asset.id,
                                currentValue,
                                currentPrice,
                                asset.coinId,
                                asset.amount
                              )
                            }
                            className="text-red-500 hover:text-red-700 font-semibold"
                          >
                            {/* <XCircle className="size-5" /> */}
                            <p>SELL</p>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Last Updated */}
        <p className="text-center text-gray-400 text-sm mt-8">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      </main>
    </div>
  );
};

export default Portfolio;
