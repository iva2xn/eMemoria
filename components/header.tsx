'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useStore } from '@/app/context/store'
import { Button } from './ui/button'
import { Menu, X, User as UserIcon, LogOut, ShieldAlert } from 'lucide-react'

export function HeroHeader() {
  const { user, logout } = useStore()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Obituaries', href: '/obituaries' },
    { name: 'Funeral Services', href: '/services' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex max-w-6xl h-16 items-center justify-between px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo.png"
            alt="M. P. Gayeta Funeral Services"
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
          <div className="flex flex-col">
            <span className="font-serif text-base font-bold leading-tight tracking-wide text-foreground">
              M. P. GAYETA
            </span>
            <span className="text-[10px] tracking-widest text-muted-foreground uppercase font-sans">
              Funeral Services
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive(link.href)
                  ? 'text-primary border-b-2 border-primary pb-1 pt-1'
                  : 'text-muted-foreground'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border/50 text-foreground font-semibold hover:bg-muted transition-colors ${
                isActive('/admin') ? 'bg-muted' : ''
              }`}
            >
              <ShieldAlert className="h-3 w-3 text-muted-foreground" />
              Admin
            </Link>
          )}
        </nav>

        {/* User Session Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-muted/60 pl-3 pr-2 py-1.5 rounded-full border border-border/60">
              <div className="flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-secondary" />
                <span className="text-xs font-semibold text-foreground max-w-[100px] truncate">
                  {user.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href="/auth/register">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-3">
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border/50 text-foreground font-semibold"
            >
              <ShieldAlert className="h-2.5 w-2.5 text-muted-foreground" />
              Admin
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-foreground"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-lg animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="space-y-1.5 px-6 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-md text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-accent text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {link.name}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-semibold text-primary transition-colors ${
                  isActive('/admin') ? 'bg-accent' : 'hover:bg-muted'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                Admin Panel Control
              </Link>
            )}

            <div className="border-t border-border/40 pt-4 mt-2">
              {user ? (
                <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/40">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-secondary" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      logout()
                      setMobileMenuOpen(false)
                    }}
                    className="text-destructive hover:bg-destructive/10 gap-1"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="sm" asChild onClick={() => setMobileMenuOpen(false)}>
                    <Link href="/auth/login" className="w-full text-center">Login</Link>
                  </Button>
                  <Button variant="default" size="sm" asChild onClick={() => setMobileMenuOpen(false)}>
                    <Link href="/auth/register" className="w-full text-center">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
