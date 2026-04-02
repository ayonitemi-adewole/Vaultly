import { useState, useEffect } from 'react';
import AppSidebar from '@/components/shared/app-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { getUserTransactions, getTransactionCount } from '@/services/portfolio';

interface Transaction {
  id: string;
  coinId: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  totalSpent: number;
  date: string;
}

const ITEMS_PER_PAGE = 10;

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchTransactions = async (page: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const data = await getUserTransactions(page, ITEMS_PER_PAGE);
      const count = await getTransactionCount();
      
      setTotalCount(count);
      
      if (append) {
        setTransactions(prev => [...prev, ...data]);
      } else {
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRefresh = () => {
    setCurrentPage(1);
    fetchTransactions();
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchTransactions(nextPage, true);
  };

  // Filter transactions based on search and filter
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.coinId.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || tx.type === filter;
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const hasMore = currentPage * ITEMS_PER_PAGE < totalCount;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 dark:bg-slate-950">
      <AppSidebar />
      <main className="ml-64 p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-slate-100">Transactions</h1>
            <p className="text-muted-foreground text-sm mt-1">
              View your complete transaction history
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2 border-border hover:bg-accent"
            >
              <RefreshCw
                className={`size-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 mb-6 dark:bg-slate-900 dark:shadow-slate-900/20">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by asset..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-border focus:border-primary"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <Filter className="size-5 text-muted-foreground mr-2" />
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-accent'}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filter === 'buy' ? 'default' : 'outline'}
                onClick={() => setFilter('buy')}
                className={filter === 'buy' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-border hover:bg-accent'}
              >
                Buy
              </Button>
              <Button
                size="sm"
                variant={filter === 'sell' ? 'default' : 'outline'}
                onClick={() => setFilter('sell')}
                className={filter === 'sell' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-border hover:bg-accent'}
              >
                Sell
              </Button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden dark:bg-slate-900 dark:shadow-slate-900/20">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground dark:text-slate-100">
                Transaction History
              </h3>
              <span className="text-sm text-muted-foreground">
                {filteredTransactions.length} of {totalCount} transactions
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="size-8 text-muted-foreground animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No transactions found.</p>
              {search || filter !== 'all' ? (
                <p className="text-muted-foreground text-sm mt-1">
                  Try adjusting your search or filters
                </p>
              ) : (
                <p className="text-muted-foreground text-sm mt-1">
                  Your transactions will appear here
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-slate-700">
                  {filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-muted transition-colors dark:hover:bg-slate-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tx.type === 'buy'
                              ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400'
                          }`}
                        >
                          {tx.type === 'buy' ? (
                            <ArrowDownRight className="size-3" />
                          ) : (
                            <ArrowUpRight className="size-3" />
                          )}
                          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground dark:text-slate-100">
                        {tx.coinId.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                        {tx.amount.toLocaleString(undefined, {
                          maximumFractionDigits: 8,
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                        {formatCurrency(tx.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-foreground dark:text-slate-100">
                        <span
                          className={tx.type === 'sell' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
                        >
                          {tx.type === 'sell' ? '-' : '+'}
                          {formatCurrency(tx.totalSpent)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalCount > ITEMS_PER_PAGE && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredTransactions.length} of {totalCount} transactions
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage(1);
                    fetchTransactions(1);
                  }}
                  disabled={currentPage === 1}
                  className="border-border hover:bg-accent"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const prevPage = currentPage - 1;
                    setCurrentPage(prevPage);
                    fetchTransactions(prevPage);
                  }}
                  disabled={currentPage === 1}
                  className="border-border hover:bg-accent"
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={!hasMore || isLoadingMore}
                  className="border-border hover:bg-accent"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Last Updated */}
        <p className="text-center text-muted-foreground text-sm mt-8">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      </main>
    </div>
  );
};

export default Transactions;
