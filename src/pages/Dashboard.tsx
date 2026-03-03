import { useState, useEffect } from 'react';
import AppSidebar from '@/components/shared/app-sidebar';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Bell,
  Search,
  ArrowDownRight as ArrowDownRightIcon,
} from 'lucide-react';
import { getUserPortfolio, getUserTransactions } from '@/services/portfolio';
import { getCoinPrices, getCoinMarketChart } from '@/services/coingecko';
import { calculateProfit } from '@/utils/calculateProfits';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';


const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [prices, setPrices] = useState<any>({});
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>(
    []
  );
  const [range, setRange] = useState<'1' | '7' | '30' | '90'>('7');
  const [growth, setGrowth] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalChange, setTotalChange] = useState<number>(0);
  const [changePercent, setChangePercent] = useState<number>(0);

  // Calculate total invested amount from portfolio
  const totalInvested = portfolio.reduce((sum, item) => {
    return sum + (item.totalAmount * item.buyPrice);
  }, 0);

  const totalValue = portfolio.reduce((sum, item) => {
    const currentPrice = prices[item.coinId]?.usd || 0;
    const { currentValue } = calculateProfit(
      item.totalAmount,
      item.buyPrice,
      currentPrice
    );
    return sum + currentValue;
  }, 0);

  // Calculate actual investment performance (profit/loss from user's buy price)
  const calculateInvestmentPerformance = () => {
    if (portfolio.length === 0 || totalInvested === 0) {
      setGrowth(null);
      return;
    }

    // Calculate total current value and total invested
    const currentTotalValue = portfolio.reduce((sum, item) => {
      const currentPrice = prices[item.coinId]?.usd || 0;
      return sum + (item.totalAmount * currentPrice);
    }, 0);

    const invested = portfolio.reduce((sum, item) => {
      return sum + (item.totalAmount * item.buyPrice);
    }, 0);

    // Calculate percentage growth based on actual investment
    const percentChange = ((currentTotalValue - invested) / invested) * 100;
    setGrowth(percentChange);
  };

  // Calculate 24h change from portfolio and CoinGecko data
  const calculate24hChange = () => {
    if (portfolio.length === 0 || Object.keys(prices).length === 0 || totalValue === 0) {
      setTotalChange(0);
      setChangePercent(0);
      return;
    }

    let totalChangeValue = 0;
    
    portfolio.forEach((asset) => {
      const currentPrice = prices[asset.coinId]?.usd || 0;
      const change24h = prices[asset.coinId]?.usd_24h_change || 0;
      const currentValue = asset.totalAmount * currentPrice;
      
      // Calculate the USD change for this asset
      const assetChange = currentValue * (change24h / 100);
      totalChangeValue += assetChange;
    });

    setTotalChange(totalChangeValue);
    setChangePercent(totalValue > 0 ? (totalChangeValue / totalValue) * 100 : 0);
  };

  useEffect(() => {
    calculate24hChange();
    calculateInvestmentPerformance();
  }, [portfolio, prices, totalValue, totalInvested]);

  const fetchPortfolio = async () => {
    setIsLoading(true);
    try {
      const userPortfolio = await getUserPortfolio();
      setPortfolio(userPortfolio);
      const coinIds = userPortfolio.map((item: any) => item.coinId);
      if (coinIds.length > 0) {
        const priceData = await getCoinPrices(coinIds);
        setPrices(priceData);
      }
      await buildPortfolioChart(userPortfolio, range);

      // Fetch transactions from Firestore
      const userTransactions = await getUserTransactions();
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  };

  const buildPortfolioChart = async (userPortfolio: any[], days: string) => {
    try {
      // For 1 day range, we don't have historical data, so show current value only
      if (days === '1') {
        const data = userPortfolio.map((asset) => {
          const currentPrice = prices[asset.coinId]?.usd || 0;
          return {
            date: new Date().toISOString().split('T')[0],
            value: asset.totalAmount * currentPrice,
          };
        });
        
        // Group by date (single entry)
        const merged: Record<string, number> = {};
        data.forEach(({ date, value }) => {
          merged[date] = (merged[date] || 0) + value;
        });

        const chartDataArray = Object.entries(merged)
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setChartData(chartDataArray);
        setGrowth(null); // No growth for 1 day view
        return;
      }

      const histories = await Promise.all(
        userPortfolio.map(async (asset) => {
          const history = await getCoinMarketChart(asset.coinId, days);
          return { asset, history };
        })
      );

      const merged: Record<string, number> = {};
      histories.forEach(({ asset, history }) => {
        history.forEach(({ date, price }: any) => {
          merged[date] = (merged[date] || 0) + price * asset.totalAmount;
        });
      });

      const data = Object.entries(merged)
        .map(([date, value]) => ({ date, value }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      setChartData(data);

      // Calculate growth based on actual investment performance
      if (data.length > 1) {
        calculateInvestmentPerformance();
      } else {
        setGrowth(null);
      }
    } catch (err) {
      console.error('Error building chart:', err);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleRangeChange = async (newRange: '1' | '7' | '30' | '90') => {
    setRange(newRange);
    await buildPortfolioChart(portfolio, newRange);
  };

  const handleRefresh = () => {
    fetchPortfolio();
  };

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
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              Welcome back! Here's your portfolio overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw
                className={`size-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="size-4" />
              <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full"></span>
            </Button>
            <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center">
              <span className="text-white text-sm font-medium">U</span>
            </div>
          </div>
        </header>

        {/* Portfolio Performance Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Portfolio Performance ({range === '1' ? '24 Hours' : `${range} Days`})
              </h2>
              {growth !== null && range !== '1' && (
                <p
                  className={`text-sm font-medium mt-1 ${
                    growth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {growth >= 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(2)}% 
                  {range === '7' ? ' this week' : range === '30' ? ' this month' : ` in ${range} days`}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {(['1', '7', '30', '90'] as const).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={range === r ? 'default' : 'outline'}
                  onClick={() => handleRangeChange(r)}
                  className={range === r ? 'bg-gray-900 text-white' : ''}
                >
                  {r}d
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <p className="text-gray-500 text-sm">Loading chart...</p>
          ) : chartData.length === 0 ? (
            <p className="text-gray-400 text-sm">No data to display.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(v: number | undefined) =>
                    v !== undefined
                      ? [`$${v.toFixed(2)}`, 'Value']
                      : ['$0.00', 'Value']
                  }
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0ea5e9"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">
                Total Balance
              </span>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Wallet className="size-5 text-gray-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {isLoading ? '...' : formatCurrency(totalValue)}
            </h2>
            <div className="flex items-center gap-1 mt-2">
              {totalChange >= 0 ? (
                <TrendingUp className="size-4 text-green-500" />
              ) : (
                <TrendingDown className="size-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  totalChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {totalChange >= 0 ? '+' : ''}
                {totalChange.toFixed(2)}%
              </span>
              <span className="text-gray-400 text-sm">last 24h</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">
                24h Change
              </span>
              <div className="p-2 bg-gray-100 rounded-lg">
                {changePercent >= 0 ? (
                  <ArrowUpRight className="size-5 text-green-500" />
                ) : (
                  <ArrowDownRightIcon className="size-5 text-red-500" />
                )}
              </div>
            </div>
            <h2
              className={`text-3xl font-bold ${
                changePercent >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {isLoading
                ? '...'
                : `${changePercent >= 0 ? '+' : ''}${formatCurrency(
                    (totalValue * changePercent) / 100
                  )}`}
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              {changePercent >= 0 ? 'Profit' : 'Loss'} today
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">
                Total Assets
              </span>
              <div className="p-2 bg-gray-100 rounded-lg">
                <TrendingUp className="size-5 text-gray-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {isLoading ? '...' : portfolio.length}
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              Different cryptocurrencies
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-8">
          <Button className="bg-gray-900 hover:bg-gray-800 gap-2">
            <Plus className="size-4" />
            Add Asset
          </Button>
          <Button variant="outline" className="gap-2">
            <Search className="size-4" />
            Explore Markets
          </Button>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading assets...
                    </td>
                  </tr>
                ) : portfolio.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No assets found. Add your first one!
                    </td>
                  </tr>
                ) : (
                  portfolio.map((asset) => {
                    const currentPrice = prices[asset.coinId]?.usd || 0;
                    const { currentValue, profit, profitPercent } =
                      calculateProfit(
                        asset.totalAmount,
                        asset.buyPrice,
                        currentPrice
                      );
                    return (
                      <tr
                        key={asset.coinId}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {asset.name}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-700">
                          {formatCurrency(currentPrice)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-700">
                          {asset.totalAmount} {asset.symbol.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(currentValue)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <span
                            className={`font-medium ${
                              profit >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}
                          >
                            {profit >= 0 ? '+' : ''}
                            {profit.toFixed(2)} ({profitPercent.toFixed(2)}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </h3>
            <Button variant="ghost" size="sm" className="text-gray-500">
              View All
            </Button>
          </div>
          <div className="divide-y divide-gray-200">
            {transactions.map((tx, index) => (
              <div
                key={index}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      tx.type === 'buy' ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {tx.type === 'buy' ? (
                      <ArrowDownRightIcon className="size-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="size-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {tx.type === 'buy' ? 'Bought' : 'Sold'} {tx.coinId.toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-500">{tx.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {tx.type === 'buy' ? '+' : '-'}
                    {formatCurrency(tx.amount * tx.price)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {tx.amount} {tx.coinId.toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
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

export default Dashboard;
