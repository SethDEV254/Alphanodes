import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { WagmiProvider } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.jsx';
import { WALLETCONNECT_PROJECT_ID } from './config.js';

const metadata = {
  name: 'Qubinodes',
  description: 'AI-Powered DeFi on BSC',
  url: 'https://alphanodes.io',
  icons: ['https://alphanodes.io/logo.png'],
};

const chains = [bsc];
const wagmiConfig = defaultWagmiConfig({ chains, projectId: WALLETCONNECT_PROJECT_ID, metadata });

createWeb3Modal({ wagmiConfig, projectId: WALLETCONNECT_PROJECT_ID, chains });

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
