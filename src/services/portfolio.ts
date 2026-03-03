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

export const updatePortfolioAsset = async (
  id: string,
  newAmount: number,
  totalSpent: number
) => {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, 'users', user.uid, 'portfolio', id);

  try {
    const snapshot = await getDocs(
      collection(db, 'users', user.uid, 'portfolio')
    );
    const docData = snapshot.docs.find((doc) => doc.id === id)?.data();

    console.log('Existing Portfolio Asset Data:', docData, 'ID:', id, 'New Amount:', newAmount, 'Total Spent:', totalSpent);

    if (!docData) throw new Error('Portfolio asset not found');

    const prevAmount = docData.totalAmount || 0;
    const prevAvgPrice = docData.averageBuyPrice || 0;

    const updatedAmount = prevAmount + newAmount;
    const updatedAvgPrice =
      (prevAvgPrice * prevAmount + totalSpent) / updatedAmount;

    await updateDoc(ref, {
      totalAmount: updatedAmount,
      averageBuyPrice: updatedAvgPrice,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error updating portfolio asset:', err);
    throw err;
  }
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

export const getUserTransactions = async (page: number = 1, pageLimit: number = 10): Promise<Array<{
  id: string;
  coinId: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  totalSpent: number;
  date: string;
}>> => {
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
