require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MongoDB connection with caching for serverless
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/user', require('./routes/user'));
app.use('/api/balance', require('./routes/balance'));
app.use('/api/deposit', require('./routes/deposit'));
app.use('/api/ai-investment', require('./routes/ai-investment'));
app.use('/api/stake', require('./routes/stake'));
app.use('/api/withdraw', require('./routes/withdraw'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/referral', require('./routes/referral'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/copytrade', require('./routes/copytrade'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/loan', require('./routes/loan'));

app.get('/api/crypto/prices', async (req, res) => {
  try {
    const resp = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd'
    );
    const json = await resp.json();
    const bnb = json?.binancecoin?.usd || 600;
    res.json({ success: true, data: { bnb, BNB: bnb } });
  } catch {
    res.json({ success: true, data: { bnb: 600, BNB: 600 } });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'AlphaNodes API' }));

// Contract event indexer — runs only in non-serverless environments
function startEventIndexer() {
  if (!process.env.CONTRACT_ADDRESS || !process.env.BSC_RPC) return;

  let ethers;
  try {
    ethers = require('ethers');
  } catch (e) {
    console.warn('ethers not installed — event indexer disabled');
    return;
  }

  const Withdrawal = require('./models/Withdrawal');
  const Balance = require('./models/Balance');
  const ABI = require('./contracts/AlphaNodes.json');

  const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, provider);

  contract.on('Deposited', async (user, amount) => {
    try {
      await connectDB();
      const amountBnb = parseFloat(ethers.formatEther(amount));
      const addr = user.toLowerCase();
      const PLATFORM_FEE = 0.02;
      const credit = parseFloat((amountBnb * (1 - PLATFORM_FEE)).toFixed(8));
      await Balance.findOneAndUpdate(
        { address: addr },
        { $inc: { tradingBalance: credit, totalDeposited: credit } }
      );
      console.log(`Indexed Deposited: user=${addr} amount=${amountBnb} credited=${credit}`);
    } catch (e) {
      console.error('Deposited event error:', e.message);
    }
  });

  contract.on('WithdrawalRequested', async (user, withdrawalId, amount) => {
    try {
      await connectDB();
      const amountBnb = parseFloat(ethers.formatEther(amount));
      const contractId = Number(withdrawalId);
      await Withdrawal.findOneAndUpdate(
        { contractWithdrawalId: contractId },
        {
          address: user.toLowerCase(),
          amount: amountBnb,
          contractWithdrawalId: contractId,
          status: 'pending',
        },
        { upsert: true, new: true }
      );
      console.log(`Indexed WithdrawalRequested: id=${contractId} user=${user} amount=${amountBnb}`);
    } catch (e) {
      console.error('Event indexer error:', e.message);
    }
  });

  contract.on('WithdrawalClaimed', async (user, withdrawalId) => {
    try {
      await connectDB();
      await Withdrawal.findOneAndUpdate(
        { contractWithdrawalId: Number(withdrawalId) },
        { status: 'claimed', claimDate: new Date() }
      );
    } catch (e) {
      console.error('Event indexer error:', e.message);
    }
  });

  console.log('Contract event indexer started');
}

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`AlphaNodes backend running on port ${PORT}`);
      startEventIndexer();
    });
  }).catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
}

module.exports = app;
