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
import { getUserPortfolio, getUserTransactions, getPortfolioMetricsFromTransactions, getPortfolioHistory } from '@/services/portfolio';
import { getCoinPrices, getCoinMarketChart } from '@/services/coingecko';
  import { calculateProfitForHolding } from '@/utils/calculateProfits';
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

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txnMetrics, setTxnMetrics] = useState<any>(null);
  const [totalChange, setTotalChange] = useState<number>(0);
  const [changePercent, setChangePercent] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [totalInvested, setTotalInvested] = useState<number>(0);

  const txnGrowth = txnMetrics && totalInvested > 0
    ? ((totalValue - totalInvested) / totalInvested) * 100
    : null;

  // Calculate 24h change using portfolio perCoin metrics
  const calculate24hChange = () => {
    if (!txnMetrics || Object.keys(prices).length === 0 || totalValue === 0) {
      setTotalChange(0);
      setChangePercent(0);
      return;
    }

    let totalChangeValue = 0;
    
    Object.entries(txnMetrics.perCoin).forEach(([coinId, coinData]: [string, any]) => {
      const change24h = prices[coinId]?.usd_24h_change || 0;
      const assetChange = coinData.totalCurrentValue * (change24h / 100);
      totalChangeValue += assetChange;
    });

    setTotalChange(totalChangeValue);
    setChangePercent(totalValue > 0 ? (totalChangeValue / totalValue) * 100 : 0);
  };

  useEffect(() => {
    if (prices && portfolio.length > 0) {
      // prevent stale data if we already set computed values from fetchPortfolio
      const currentTotal = portfolio.reduce((sum: number, asset: any) => {
        const price = prices[asset.coinId]?.usd || 0;
        return sum + (asset.totalAmount || asset.amount || 0) * price;
      }, 0);
      setTotalValue(currentTotal);

      const change24h = portfolio.reduce((sum: number, asset: any) => {
        const price = prices[asset.coinId]?.usd || 0;
        const changePct = prices[asset.coinId]?.usd_24h_change || 0;
        const amount = asset.totalAmount || asset.amount || 0;
        return sum + amount * price * (changePct / 100);
      }, 0);
      setTotalChange(change24h);
      setChangePercent(currentTotal > 0 ? (change24h / currentTotal) * 100 : 0);
    } else {
      calculate24hChange();
    }
  }, [txnMetrics, prices, portfolio]);

const fetchPortfolio = async (targetRange: '1' | '7' | '30' | '90' = range) => {
    setIsLoading(true);
    try {
      const userPortfolio = await getUserPortfolio();
      setPortfolio(userPortfolio);

      const txnData = await getPortfolioMetricsFromTransactions();
      setTxnMetrics(txnData);

      const coinIds = [...new Set(userPortfolio.map((asset: any) => asset.coinId))];
      let priceData: any = {};
      if (coinIds.length > 0) {
        priceData = await getCoinPrices(coinIds);
        setPrices(priceData);
      }

      // Recalculate total value from current portfolio + prices
      const currentTotalValue = userPortfolio.reduce((sum: number, asset: any) => {
        const price = priceData[asset.coinId]?.usd || 0;
        return sum + (asset.totalAmount || asset.amount || 0) * price;
      }, 0);
      setTotalValue(currentTotalValue);

      const investedValue = txnData?.totals?.totalBuyValue || 0;
      setTotalInvested(investedValue);

      // 24h change is based on coin-level 24h change and current holdings
      const change24h = userPortfolio.reduce((sum: number, asset: any) => {
        const price = priceData[asset.coinId]?.usd || 0;
        const changePct = priceData[asset.coinId]?.usd_24h_change || 0;
        const amount = asset.totalAmount || asset.amount || 0;
        return sum + amount * price * (changePct / 100);
      }, 0);
      setTotalChange(change24h);
      setChangePercent(currentTotalValue > 0 ? (change24h / currentTotalValue) * 100 : 0);

      // Prefer historical portfolio snapshots for the chart, fallback to per-coin API series
      if (targetRange === '1') {
        await buildPortfolioChart(userPortfolio, targetRange);
      } else {
        const history = await getPortfolioHistory(parseInt(targetRange, 10));
        if (history && history.length > 0) {
          setChartData(history);
        } else {
          await buildPortfolioChart(userPortfolio, targetRange);
        }
      }

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

    } catch (err) {
      console.error('Error building chart:', err);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [range]);

  const handleRangeChange = async (newRange: '1' | '7' | '30' | '90') => {
    setRange(newRange);
    await fetchPortfolio(newRange);
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
    <div className="min-h-screen bg-background transition-colors duration-300 dark:bg-slate-950">
      <AppSidebar />
      <main className="ml-64 p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-slate-100">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
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
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium">U</span>
            </div>
          </div>
        </header>

        {/* Portfolio Performance Chart */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-8 dark:bg-slate-900 dark:shadow-slate-900/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground dark:text-slate-100">
                Portfolio Performance ({range === '1' ? '24 Hours' : `${range} Days`})
              </h2>
              {txnGrowth !== null && range !== '1' && (
                <p
                  className={`text-sm font-medium mt-1 ${
                    txnGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {txnGrowth >= 0 ? '▲' : '▼'} {Math.abs(txnGrowth).toFixed(2)}% 
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
                  className={range === r ? 'bg-primary text-primary-foreground' : ''}
                >
                  {r}d
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading chart...</p>
          ) : chartData.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data to display.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  className="dark:fill-slate-400"
                />
                <YAxis
                  tickFormatter={(v) => `$${v.toLocaleString()}`}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  className="dark:fill-slate-400"
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
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border dark:bg-slate-900 dark:shadow-slate-900/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground text-sm font-medium">
                Total Balance
              </span>
              <div className="p-2 bg-muted rounded-lg">
                <Wallet className="size-5 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground dark:text-slate-100">
              {isLoading ? '...' : formatCurrency(totalValue)}
            </h2>
            <div className="flex items-center gap-1 mt-2">
              {totalChange >= 0 ? (
                <TrendingUp className="size-4 text-green-500 dark:text-green-400" />
              ) : (
                <TrendingDown className="size-4 text-red-500 dark:text-red-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  totalChange >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                }`}
              >
                {totalChange >= 0 ? '+' : ''}
                {totalChange.toFixed(2)}%
              </span>
              <span className="text-muted-foreground text-sm">last 24h</span>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border border-border dark:bg-slate-900 dark:shadow-slate-900/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground text-sm font-medium">
                24h Change
              </span>
              <div className="p-2 bg-muted rounded-lg">
                {changePercent >= 0 ? (
                  <ArrowUpRight className="size-5 text-green-500 dark:text-green-400" />
                ) : (
                  <ArrowDownRightIcon className="size-5 text-red-500 dark:text-red-400" />
                )}
              </div>
            </div>
            <h2
              className={`text-3xl font-bold ${
                changePercent >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
              }`}
            >
              {isLoading
                ? '...'
                : `${changePercent >= 0 ? '+' : ''}${formatCurrency(
                    (totalValue * changePercent) / 100
                  )}`}
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              {changePercent >= 0 ? 'Profit' : 'Loss'} today
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border border-border dark:bg-slate-900 dark:shadow-slate-900/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground text-sm font-medium">
                Total Assets
              </span>
              <div className="p-2 bg-muted rounded-lg">
                <TrendingUp className="size-5 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground dark:text-slate-100">
              {isLoading ? '...' : portfolio.length}
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              Different cryptocurrencies
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-8">
          <Button className="bg-primary hover:bg-primary/90 gap-2 text-primary-foreground">
            <Plus className="size-4" />
            Add Asset
          </Button>
          <Button variant="outline" className="gap-2 border-border hover:bg-accent">
            <Search className="size-4" />
            Explore Markets
          </Button>
        </div>

        {/* Assets Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden dark:bg-slate-900 dark:shadow-slate-900/20">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground dark:text-slate-100">Your Assets</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Profit/Loss
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-muted-foreground"
                    >
                      Loading assets...
                    </td>
                  </tr>
                ) : portfolio.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-muted-foreground"
                    >
                      No assets found. Add your first one!
                    </td>
                  </tr>
                ) : (
                  portfolio.map((asset) => {
                    const currentPrice = prices[asset.coinId]?.usd || 0;
        const { currentValue, profit, profitPercent } =
                      calculateProfitForHolding(
                        asset.totalAmount,
                        asset.averageBuyPrice || asset.buyPrice,
                        currentPrice
                      );
                    return (
                      <tr
                        key={asset.coinId}
                        className="hover:bg-muted transition-colors dark:hover:bg-slate-800"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-foreground dark:text-slate-100">
                          {asset.name}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                          {formatCurrency(currentPrice)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                          {asset.totalAmount} {asset.symbol.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-foreground dark:text-slate-100">
                          {formatCurrency(currentValue)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <span
                            className={`font-medium ${
                              profit >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
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
