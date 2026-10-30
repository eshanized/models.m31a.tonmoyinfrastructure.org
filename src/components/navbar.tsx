'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Layers, Terminal, BookOpen, Clock, Cpu } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Overview', icon: Activity },
    { href: '/models', label: 'Models Explorer', icon: Layers },
    { href: '/changelog', label: 'Changelog', icon: Clock },
    { href: '/docs/api', label: 'API Reference', icon: Terminal },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground hover:opacity-90">
            <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm tracking-wide">NVIDIA Build</span>
              <span className="text-xs text-muted-foreground font-mono">models.m31a</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-secondary text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/60 border border-border text-[11px] font-mono text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>M31A Connected</span>
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
