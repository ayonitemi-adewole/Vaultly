import { db, auth } from '@/services/firebase';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  query,
  orderBy,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { getUserProfile, updateUserBalance } from './user';

export const getUserPortfolio = async () => {
  const user = auth.currentUser;
  if (!user) return [];

  const ref = collection(db, 'users', user.uid, 'portfolio');
  const snapshot = await getDocs(ref);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    coinId: doc.data().coinId,
    ...doc.data(),
  }));
};

export const addToPortfolio = async (coin: any) => {
  const user = auth.currentUser;
  if (!user) return;

  // Use coin ID as the document ID
  const ref = doc(db, 'users', user.uid, 'portfolio', coin.coinId);
  await setDoc(ref, {
    ...coin,
    totalAmount: coin.amount || 0,
    averageBuyPrice: coin.buyPrice || 0,
    dateAdded: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

export const deleteFromPortfolio = async (id: string, currentValue: number) => {
  const user = auth.currentUser;
  if (!user) return;
  await updateUserBalance(user.uid, currentValue + (await getUserProfile(user.uid))?.balance || 0);

  const ref = doc(db, 'users', user.uid, 'portfolio', id);
  await deleteDoc(ref);
};

export const sellAsset = async (
  coinId: string,
  sellAmount: number,
  sellPrice: number,
  totalReceived: number,
  selectedDate: string
) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  await runTransaction(db, async (transaction) => {
    // Get portfolio asset
    const portfolioRef = doc(db, 'users', user.uid, 'portfolio', coinId);
    const portfolioSnap = await transaction.get(portfolioRef);
    if (!portfolioSnap.exists()) throw new Error('Portfolio asset not found');

    const assetData = portfolioSnap.data();
    const currentAmount = assetData?.totalAmount || 0;

    if (sellAmount > currentAmount) {
      throw new Error('Insufficient holdings');
    }

    const newAmount = currentAmount - sellAmount;

    if (newAmount <= 0) {
      // Sell all, delete
      transaction.delete(portfolioRef);
    } else {
      // Partial sell
      transaction.update(portfolioRef, {
        totalAmount: newAmount,
        updatedAt: new Date().toISOString(),
      });
    }

    // Log transaction
    const transactionsRef = collection(db, 'users', user.uid, 'transactions');
    const newTxnRef = doc(transactionsRef);
    transaction.set(newTxnRef, {
      coinId,
      type: 'sell',
      amount: sellAmount,
      price: sellPrice,
      totalSpent: totalReceived, // For sells, this is received
      date: selectedDate || new Date().toISOString(),
    });

    // Update balance
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await transaction.get(userRef);
    const currentBalance = userSnap.data()?.balance || 0;
    transaction.update(userRef, {
      balance: currentBalance + totalReceived,
    });
  });
};

export const buyAsset = async (
  coin: any,
  usdSpent: number,
  selectedDate: string
) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  await runTransaction(db, async (transaction) => {
    // Get user profile
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) throw new Error('User profile not found');

    const userData = userSnap.data();
    const currentBalance = userData.balance || 0;

    if (usdSpent > currentBalance) {
      throw new Error('Insufficient balance');
    }

    // Check if coin exists in portfolio
    const portfolioRef = doc(db, 'users', user.uid, 'portfolio', coin.coinId);
    const portfolioSnap = await transaction.get(portfolioRef);

    if (portfolioSnap.exists()) {
      // Update existing
      const existingData = portfolioSnap.data();
      const prevAmount = existingData?.totalAmount || 0;
      const prevAvgPrice = existingData?.averageBuyPrice || 0;
      const newAmount = prevAmount + coin.amount;
      const newAvgPrice = (prevAvgPrice * prevAmount + usdSpent) / newAmount;

      transaction.update(portfolioRef, {
        totalAmount: newAmount,
        averageBuyPrice: newAvgPrice,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Add new
      transaction.set(portfolioRef, {
        ...coin,
        totalAmount: coin.amount,
        averageBuyPrice: coin.buyPrice,
        dateAdded: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Log transaction
    const transactionsRef = collection(db, 'users', user.uid, 'transactions');
    const newTxnRef = doc(transactionsRef);
    transaction.set(newTxnRef, {
      coinId: coin.coinId,
      type: 'buy',
      amount: coin.amount,
      price: coin.buyPrice,
      totalSpent: usdSpent,
      date: selectedDate || new Date().toISOString(),
    });

    // Update balance
    transaction.update(userRef, {
      balance: currentBalance - usdSpent,
    });
  });
};

export const logTransaction = async (transaction: {
  coinId: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  totalSpent: number;
}, selectedDate: any) => {
  const user = auth.currentUser;
  if (!user) return;

  const ref = collection(db, 'users', user.uid, 'transactions');
  await addDoc(ref, {
    ...transaction,
    date: selectedDate || new Date().toISOString(),
  });
};

export interface Transaction {
  id: string;
  coinId: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  totalSpent: number;
  date: string;
}

export const getUserTransactions = async (page: number = 1, pageLimit: number = 10): Promise<Transaction[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  const ref = collection(db, 'users', user.uid, 'transactions');
  const q = query(ref, orderBy('date', 'desc'), limit(pageLimit * page));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      coinId: data.coinId || '',
      type: data.type || 'buy',
      amount: data.amount || 0,
      price: data.price || 0,
      totalSpent: data.totalSpent || 0,
      date: data.date || '',
    };
  });
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  const ref = collection(db, 'users', user.uid, 'transactions');
  const snapshot = await getDocs(ref);
  
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      coinId: data.coinId || '',
      type: data.type || 'buy',
      amount: data.amount || 0,
      price: data.price || 0,
      totalSpent: data.totalSpent || 0,
      date: data.date || '',
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

import type { PortfolioTotals, PerCoinMetrics } from '../utils/calculateProfits';
import { aggregateTransactionsMetrics } from '../utils/calculateProfits';
import { getCoinPrices } from './coingecko';

export const getPortfolioMetricsFromTransactions = async (): Promise<{
  perTransaction: any[];
  totals: PortfolioTotals;
  perCoin: Record<string, PerCoinMetrics>;
}> => {
  const transactions = await getAllTransactions();
  const coinIds = [...new Set(transactions.map((t: Transaction) => t.coinId))];
  
  const pricesData: Record<string, number> = {};
  if (coinIds.length > 0) {
    const prices = await getCoinPrices(coinIds);
    Object.assign(pricesData, prices);
  }

  return aggregateTransactionsMetrics(transactions, pricesData);
};

export const getTransactionCount = async () => {
  const user = auth.currentUser;
  if (!user) return 0;

  const ref = collection(db, 'users', user.uid, 'transactions');
  const snapshot = await getDocs(ref);
  
  return snapshot.size;
};

// 🔹 Save daily portfolio snapshot for historical chart data
export const savePortfolioSnapshot = async (portfolio: any[], prices: any) => {
  const user = auth.currentUser;
  if (!user) return;

  // Calculate total portfolio value
  const totalValue = portfolio.reduce((sum, asset) => {
    const currentPrice = prices[asset.coinId]?.usd || asset.buyPrice || 0;
    return sum + (currentPrice * (asset.amount || asset.totalAmount || 0));
  }, 0);

  const ref = collection(db, 'users', user.uid, 'portfolioHistory');
  
  // Check if we already have a snapshot for today
  const today = new Date().toISOString().split('T')[0];
  const q = query(ref, orderBy('date', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  
  const existingDoc = snapshot.docs.find((doc) => {
    const docDate = doc.data().date?.split('T')[0];
    return docDate === today;
  });

  if (existingDoc) {
    // Update today's snapshot
    const docRef = doc(db, 'users', user.uid, 'portfolioHistory', existingDoc.id);
    await updateDoc(docRef, {
      totalValue,
      updatedAt: new Date().toISOString(),
    });
  } else {
    // Create new snapshot for today
    await addDoc(ref, {
      date: new Date().toISOString(),
      totalValue,
      createdAt: new Date().toISOString(),
    });
  }
};

// 🔹 Get portfolio history for chart (last N days)
export const getPortfolioHistory = async (days: number = 7): Promise<{ date: string; value: number }[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  const ref = collection(db, 'users', user.uid, 'portfolioHistory');
  
  // Calculate the date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  // Query for documents within the date range
  const q = query(
    ref, 
    orderBy('date', 'desc'),
    limit(days)
  );
  
  const snapshot = await getDocs(q);
  
  const historyData = snapshot.docs
    .map((doc) => ({
      date: doc.data().date?.split('T')[0] || '',
      value: doc.data().totalValue || 0,
    }))
    .filter((item) => item.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Fill in missing days with the last known value
  const filledData: { date: string; value: number }[] = [];
  const dataMap = new Map(historyData.map((item) => [item.date, item.value]));
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(endDate.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    filledData.push({
      date: dateStr,
      value: dataMap.get(dateStr) || 0,
    });
  }

  return filledData;
};
