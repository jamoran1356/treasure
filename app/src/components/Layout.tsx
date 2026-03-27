import { FC, ReactNode } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import Image from 'next/image';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-[300px] h-10 relative">
                <Image
                  src="/assets/images/logo.webp"
                  alt="Programmable Treasury Logo"
                  fill
                  sizes="300px"
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
            
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="text-slate-300 hover:text-white transition">
                Dashboard
              </Link>
              <Link href="/rules" className="text-slate-300 hover:text-white transition">
                Rules
              </Link>
              <Link href="/history" className="text-slate-300 hover:text-white transition">
                History
              </Link>
            </nav>

            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-slate-400 text-sm">
            <p>Built for StableHacks 2026 • Powered by Solana • Created by Jesús Moran (<a href="https://www.github.com/jamoran1356" target="_blank" rel="noopener noreferrer">@jamoran1356</a>)</p>
            <p className="mt-1">Institutional-grade automated treasury management</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
