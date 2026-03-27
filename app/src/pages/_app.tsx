import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import '../styles/globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { ToastProvider } from '../contexts/ToastContext';

const WalletProvider = dynamic(
  () => import('../contexts/WalletProvider').then((m) => m.WalletProvider),
  { ssr: false }
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <WalletProvider>
        <Component {...pageProps} />
      </WalletProvider>
    </ToastProvider>
  );
}
