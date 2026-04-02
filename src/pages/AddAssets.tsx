import { useState, useEffect } from 'react';
import AppSidebar from '@/components/shared/app-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  TrendingUp,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  buyAsset,
} from '@/services/portfolio';
import {
  searchCoins,
  getCoinPrices,
  getCustomDayPrice,
} from '@/services/coingecko';
import { getUserProfile } from '@/services/user';
import useAuth from '@/hooks/useAuth';

interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  image: string;
}

const popularCoins = [
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  },
  {
    id: 'cardano',
    name: 'Cardano',
    symbol: 'ADA',
    image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  },
  {
    id: 'ripple',
    name: 'XRP',
    symbol: 'XRP',
    image:
      'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  },
  {
    id: 'dogecoin',
    name: 'Dogecoin',
    symbol: 'DOGE',
    image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  },
];

const AddAssets = () => {
  const { user } = useAuth();
  const [inputMode, setInputMode] = useState<'amount' | 'usd'>('amount');
  const [inputSelectDate, setInputSelectDate] = useState<'today' | 'custom'>(
    'today'
  );

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CoinSearchResult[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinSearchResult | null>(
    null
  );
  const [amount, setAmount] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userBalance, setUserBalance] = useState<number>(0);

  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user?.uid) return;
      // Fetch user profile to get balance
      const profile = await getUserProfile(user.uid);
      setUserBalance(profile?.balance ?? 0);

    };
    fetchUserDetails();
  }, [user]);

  // Coin search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await searchCoins(searchQuery);
        const formatted = results.map((coin: any) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          image: coin.thumb,
        }));
        setSearchResults(formatted);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  // Fetch current coin price when coin selected
  useEffect(() => {
    const fetchPrice = async () => {
      if (!selectedCoin) return;
      try {
        const priceData = await getCoinPrices([selectedCoin.id]);
        console.log(selectedCoin.id, priceData);
        const price = priceData[selectedCoin.id]?.usd || 0;
        setCurrentPrice(price);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPrice();
  }, [selectedCoin]);

  // Fetch coins price when date changes
  useEffect(() => {
    const fetchCustomPrice = async () => {
      if (inputSelectDate === 'today') return;

      try {
        const priceByDate = await getCustomDayPrice(
          selectedCoin?.id || '',
          selectedDate
        );
        setCurrentPrice(priceByDate || 0);
        console.log(
          'Custom Price for',
          selectedCoin?.id,
          'on',
          selectedDate,
          ':',
          priceByDate
        );
      } catch (err) {
        console.error(err);
      }
    };
    fetchCustomPrice();
  }, [inputSelectDate, selectedDate, selectedCoin]);

  // Update coin amount if USD input changes
  // useEffect(() => {
  //   if (usdAmount && currentPrice > 0) {
  //     setAmount((parseFloat(usdAmount) / currentPrice).toFixed(6));
  //   }
  // }, [usdAmount, currentPrice]);

  const handleSelectCoin = (coin: CoinSearchResult) => {
    setSelectedCoin(coin);
    setSearchQuery('');
    setSearchResults([]);
    setAmount('');
    setUsdAmount('');
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoin || !amount || !usdAmount) {
      setError('Please fill in all fields');
      return;
    }

    const coinAmount = parseFloat(amount);
    const usdSpent = parseFloat(usdAmount);

    setIsSubmitting(true);
    setError('');

    try {
      await buyAsset({
        coinId: selectedCoin.id,
        name: selectedCoin.name,
        symbol: selectedCoin.symbol,
        amount: coinAmount,
        buyPrice: currentPrice,
        image: selectedCoin.image,
      }, usdSpent, selectedDate);

      // Update local state
      setUserBalance((prev) => prev - usdSpent);

      setSuccess(true);
      setTimeout(() => {
        setAmount('');
        setUsdAmount('');
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to add asset. Try again.');
    } finally {
      setIsSubmitting(false);
    }
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
        <header className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="size-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-foreground dark:text-slate-100">Add New Asset</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search and add cryptocurrencies to your portfolio
          </p>
        </header>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 dark:bg-green-950/50 dark:border-green-800">
            <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
            <span className="text-green-700 font-medium dark:text-green-400">
              Asset added successfully!
            </span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 dark:bg-red-950/50 dark:border-red-800">
            <XCircle className="size-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Search */}
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border dark:bg-slate-900 dark:shadow-slate-900/20">
            <h2 className="text-lg font-semibold text-foreground dark:text-slate-100 mb-4">
              Search Cryptocurrency
            </h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-border focus:border-primary"
                disabled={!!selectedCoin}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground animate-spin" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {searchResults.map((coin) => (
                  <button
                    key={coin.id}
                    onClick={() => handleSelectCoin(coin)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                  >
                    <img
                      src={coin.image}
                      alt={coin.name}
                      className="size-8 rounded-full"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).src =
                          'https://via.placeholder.com/32')
                      }
                    />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{coin.name}</p>
                      <p className="text-sm text-gray-500">{coin.symbol}</p>
                    </div>
                    <Plus className="size-4 ml-auto text-gray-400" />
                  </button>
                ))}
              </div>
            )}

            {!searchQuery && !selectedCoin && (
              <div>
                <p className="text-sm text-gray-500 mb-3">
                  Popular Cryptocurrencies
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {popularCoins.map((coin) => (
                    <button
                      key={coin.id}
                      onClick={() => handleSelectCoin(coin)}
                      className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <img
                        src={coin.image}
                        alt={coin.name}
                        className="size-6 rounded-full"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {coin.symbol}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Add Asset Form */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedCoin ? 'Asset Details' : 'Select a Cryptocurrency'}
            </h2>
            {!selectedCoin ? (
              <div className="text-center py-12 text-gray-500">
                <TrendingUp className="size-12 mx-auto mb-3 text-gray-300" />
                <p>Search and select a cryptocurrency to continue</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-6">
                  <img
                    src={selectedCoin.image}
                    alt={selectedCoin.name}
                    className="size-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedCoin.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedCoin.symbol}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCoin(null);
                      setAmount('');
                      setUsdAmount('');
                      setError('');
                      setSuccess(false);
                      setInputSelectDate('today');
                      setSelectedDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="ml-auto text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="size-5" />
                  </button>
                </div>

                <div className="mb-6">
                  {/* Available balance */}
                  <p className="text-sm text-gray-500 mb-2">
                    Available Balance:{' '}
                    <span className="font-medium">
                      {formatCurrency(userBalance)}
                    </span>
                  </p>

                  {/* Tab-style toggle */}
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-4">
                    <button
                      type="button"
                      className={`flex-1 py-2 text-sm font-medium ${
                        inputMode === 'amount'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setInputMode('amount')}
                    >
                      Coin Amount
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 text-sm font-medium ${
                        inputMode === 'usd'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setInputMode('usd')}
                    >
                      USD to Spend
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 mb-2">
                    <span className="font-medium">Select Date</span>
                  </p>
                  {/* Toggle for date */}
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-4">
                    <button
                      type="button"
                      className={`flex-1 py-2 text-sm font-medium ${
                        inputSelectDate === 'today'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        setInputSelectDate('today');
                        setSelectedDate(new Date().toISOString().split('T')[0]);
                        setAmount('');
                        setUsdAmount('');
                      }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 text-sm font-medium ${
                        inputSelectDate === 'custom'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        setInputSelectDate('custom');
                        setAmount('');
                        setUsdAmount('');
                      }}
                    >
                      Custom Day
                    </button>
                  </div>

                  {inputSelectDate === 'custom' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Date
                      </label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Input fields */}
                  {inputMode === 'amount' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Coin Amount
                      </label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAmount(val);
                          setUsdAmount(
                            currentPrice
                              ? (parseFloat(val) * currentPrice).toFixed(2)
                              : ''
                          );
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        You will spend{' '}
                        <span className="font-medium">
                          {formatCurrency(parseFloat(usdAmount) || 0)}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        USD to Spend
                      </label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={usdAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUsdAmount(val);
                          // Update coin amount automatically
                          setAmount(
                            currentPrice
                              ? (parseFloat(val) / currentPrice).toFixed(6)
                              : ''
                          );
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        You will receive{' '}
                        <span className="font-medium">
                          {parseFloat(amount) || 0} {selectedCoin?.symbol}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {parseFloat(amount) > 0 && (
                  <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Total Investment</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(parseFloat(usdAmount) || 0)}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-gray-800"
                  disabled={isSubmitting || !amount || !usdAmount}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Adding Asset...
                    </>
                  ) : (
                    <>
                      <Plus className="size-4 mr-2" />
                      Add to Portfolio
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
        {/* Tips Section  */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">
            Tips for Adding Assets
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • Search for the cryptocurrency you want to add using the search
              bar
            </li>
            <li>• Enter the amount of tokens you purchased</li>
            <li>
              • Enter the price you paid per token at the time of purchase
            </li>
            <li>
              • The system will calculate your total investment automatically
            </li>
            <li>
              • You can always update your holdings later from the dashboard
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
};
export default AddAssets;
