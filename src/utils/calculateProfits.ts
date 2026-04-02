export interface TransactionMetrics {
  buyValue: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
}

export interface PortfolioTotals {
  totalBuyValue: number;
  totalCurrentValue: number;
  totalProfit: number;
  totalProfitPercent: number;
}

export interface PerCoinMetrics {
  netAmount: number;
  avgBuyPrice: number;
  totalBuyValue: number;
  totalCurrentValue: number;
  profit: number;
  profitPercent: number;
  allocationPercent: number;
}

export const calculateTransactionMetrics = (amount: number, buyPrice: number, currentPrice: number): TransactionMetrics => {
  const buyValue = amount * buyPrice;
  const currentValue = amount * currentPrice;
  const profit = currentValue - buyValue;
  const profitPercent = buyValue > 0 ? (profit / buyValue) * 100 : 0;

  return {
    buyValue,
    currentValue,
    profit,
    profitPercent
  };
};

export const calculateProfitForHolding = (amount: number, buyPrice: number, currentPrice: number) => {
  const currentValue = amount * currentPrice;
  const initialValue = amount * buyPrice;
  const profit = currentValue - initialValue;
  const profitPercent = ((currentPrice - buyPrice) / buyPrice) * 100 || 0;

  return {
    currentValue,
    profit,
    profitPercent
  };
};

export const aggregateTransactionsMetrics = (transactions: any[], prices: Record<string, number>): { perTransaction: TransactionMetrics[]; totals: PortfolioTotals; perCoin: Record<string, PerCoinMetrics> } => {
  const perTransaction: TransactionMetrics[] = [];
  const coinTotals: Record<string, any> = {};
  let grandTotalBuy = 0;
  let grandTotalCurrent = 0;

  // Sort transactions by date ascending to process in order
  const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedTransactions.forEach((txn: any) => {
    const coinId = txn.coinId;

    if (!coinTotals[coinId]) {
      coinTotals[coinId] = { totalAmount: 0, totalBuyValue: 0, totalBuyAmount: 0 };
    }

    if (txn.type === 'buy') {
      coinTotals[coinId].totalAmount += txn.amount;
      coinTotals[coinId].totalBuyValue += txn.totalSpent;
      coinTotals[coinId].totalBuyAmount += txn.amount;
    } else if (txn.type === 'sell') {
      // For sells, reduce amount and buy value proportionally
      const sellAmount = txn.amount;
      if (coinTotals[coinId].totalAmount >= sellAmount) {
        const proportion = sellAmount / coinTotals[coinId].totalAmount;
        coinTotals[coinId].totalBuyValue -= coinTotals[coinId].totalBuyValue * proportion;
        coinTotals[coinId].totalAmount -= sellAmount;
        coinTotals[coinId].totalBuyAmount -= sellAmount;
      }
    }
  });

  // Now calculate metrics for current holdings
  Object.entries(coinTotals).forEach(([coinId, data]: [string, any]) => {
    if (data.totalAmount > 0) {
      const currentPrice = prices[coinId] || 0;
      const currentValue = data.totalAmount * currentPrice;
      const buyValue = data.totalBuyValue;
      const profit = currentValue - buyValue;
      const profitPercent = buyValue > 0 ? (profit / buyValue) * 100 : 0;

      perTransaction.push({
        buyValue,
        currentValue,
        profit,
        profitPercent
      });

      grandTotalBuy += buyValue;
      grandTotalCurrent += currentValue;
    }
  });

  const totals: PortfolioTotals = {
    totalBuyValue: grandTotalBuy,
    totalCurrentValue: grandTotalCurrent,
    totalProfit: grandTotalCurrent - grandTotalBuy,
    totalProfitPercent: grandTotalBuy > 0 ? ((grandTotalCurrent - grandTotalBuy) / grandTotalBuy) * 100 : 0
  };

  const perCoin: Record<string, PerCoinMetrics> = {};
  Object.entries(coinTotals).forEach(([coinId, data]: [string, any]) => {
    if (data.totalAmount > 0) {
      const currentPrice = prices[coinId] || 0;
      const currentValue = data.totalAmount * currentPrice;
      const buyValue = data.totalBuyValue;
      const avgBuyPrice = data.totalBuyAmount > 0 ? data.totalBuyValue / data.totalBuyAmount : 0;

      perCoin[coinId] = {
        netAmount: data.totalAmount,
        avgBuyPrice,
        totalBuyValue: buyValue,
        totalCurrentValue: currentValue,
        profit: currentValue - buyValue,
        profitPercent: buyValue > 0 ? ((currentValue - buyValue) / buyValue) * 100 : 0,
        allocationPercent: totals.totalCurrentValue > 0 ? (currentValue / totals.totalCurrentValue) * 100 : 0
      };
    }
  });

  return { perTransaction, totals, perCoin };
};
