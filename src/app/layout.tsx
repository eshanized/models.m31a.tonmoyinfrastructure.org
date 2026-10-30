import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: {
    template: '%s | NVIDIA Build Model Intelligence',
    default: 'NVIDIA Build Model Intelligence Dashboard | models.m31a.tonmoyinfrastructure.org',
  },
  description:
    'Production model intelligence, canonical TOML specifications, synthetic latency tracking, and verified availability benchmarks for NVIDIA Build NIM models. Integrated with M31A.',
  metadataBase: new URL('https://models.m31a.tonmoyinfrastructure.org'),
  keywords: [
    'NVIDIA Build',
    'NVIDIA NIM',
    'Model Intelligence',
    'M31A',
    'AI Model Observatory',
    'Model Benchmarks',
    'Inference Latency',
    'Nemotron',
    'Llama 3.3',
  ],
  authors: [{ name: 'Tonmoy Infrastructure & Vision (TIV)', url: 'https://tonmoyinfrastructure.org' }],
  openGraph: {
    title: 'NVIDIA Build Model Intelligence Dashboard',
    description:
      'Continuous synthetic endpoint observability, canonical TOML registry, and real-time capability verification for NVIDIA Build foundation models.',
    url: 'https://models.m31a.tonmoyinfrastructure.org',
    siteName: 'NVIDIA Build Model Intelligence',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
