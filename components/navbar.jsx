"use client"

import * as React from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Menu, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

// Navigation items configuration
const navItems = [
  { name: "Home", href: "/" },
  { name: "Sign Document", href: "/sign" },
  { name: "Verify", href: "/verify" },
  { name: "Lookup", href: "/lookup" },
]

const Navbar = () => {
  const { data: session, status } = useSession()
  const isLoggedIn = status === "authenticated"
  const isLoading = status === "loading"

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 max-w-5xl">
        {/* Brand Logo */}
        <div className="w-[180px]">
          <Link href="/" className="flex items-center space-x-2 group">
            <BrandLogo />
            <BrandText />
          </Link>
        </div>
        
        {/* Desktop Navigation - Centered */}
        <div className="hidden md:flex flex-1 justify-center">
          <nav>
            <ul className="flex items-center space-x-8">
              {navItems.map((item) => (
                <li key={item.name}>
                  <NavLink item={item} />
                </li>
              ))}
            </ul>
          </nav>
        </div>
        
        {/* Authentication Section - Right aligned with fixed width */}
        <div className="hidden md:flex items-center justify-end w-[180px]">
          <AuthSection isLoading={isLoading} isLoggedIn={isLoggedIn} session={session} />
        </div>
        
        {/* Mobile Menu Button - Only visible on mobile */}
        <div className="md:hidden ml-auto">
          <MobileMenu 
            isLoading={isLoading} 
            isLoggedIn={isLoggedIn} 
            session={session} 
          />
        </div>
      </div>
    </header>
  )
}

// Simple and minimalist brand logo component
const BrandLogo = () => (
  <div className="relative w-8 h-8 flex items-center justify-center overflow-hidden group-hover:opacity-90 transition-opacity">
    <svg viewBox="0 0 24 24" width="24" height="24" className="text-primary">
      <path 
        d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"
        fill="currentColor"
        opacity="0.2"
      />
      <path 
        d="M12 7v5l3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path 
        d="M17 13h2.5c0.8 0 1.5-0.7 1.5-1.5v-2c0-0.8-0.7-1.5-1.5-1.5H17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path 
        d="M8 9H4.5C3.7 9 3 9.7 3 10.5v2c0 0.8 0.7 1.5 1.5 1.5H8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  </div>
)

// Refined brand text component
const BrandText = () => (
  <div className="flex flex-col">
    <span className="font-bold text-lg tracking-tight leading-none">
      Notar<span className="text-primary">.io</span>
    </span>
    <span className="text-[10px] text-muted-foreground tracking-wide uppercase font-medium leading-tight">Digital Signature</span>
  </div>
)

// Enhanced navigation link component with subtle animation
const NavLink = ({ item }) => (
  <Link 
    href={item.href}
    className="text-sm font-medium transition-colors hover:text-primary py-2 px-1 relative group"
  >
    {item.name}
    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 opacity-80 group-hover:w-full"></span>
  </Link>
)

// Authentication section component with improved styling
const AuthSection = ({ isLoading, isLoggedIn, session }) => {
  if (isLoading) {
    return <div className="w-[150px] h-9 flex items-center justify-end">
      <div className="w-5 h-5 border-2 border-t-transparent border-primary/40 rounded-full animate-spin"></div>
    </div>
  }
  
  if (isLoggedIn) {
    return <ProfileDropdown session={session} />
  }
  
  return (
    <>
      <Button variant="ghost" size="sm" asChild className="text-foreground hover:text-primary hover:bg-primary/5 transition-colors">
        <Link href="/login">Login</Link>
      </Button>
      <Button size="sm" asChild className="ml-2 bg-primary hover:bg-primary/90 text-white transition-colors">
        <Link href="/register">Register</Link>
      </Button>
    </>
  )
}

// Mobile menu component with improved styling
const MobileMenu = ({ isLoading, isLoggedIn, session }) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon" className="hover:bg-primary/5 text-foreground hover:text-primary">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
    </SheetTrigger>
    <SheetContent side="right" className="w-[280px] sm:w-[350px] bg-background border-l border-border/40">
      <div className="flex flex-col space-y-6 py-6">
        <div className="flex items-center space-x-3">
          <BrandLogo />
          <BrandText />
        </div>
        
        <nav className="pt-6">
          <ul className="space-y-4">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link 
                  href={item.href}
                  className="text-base font-medium transition-colors hover:text-primary block py-1"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="border-t pt-6 mt-2 border-border/40">
          <h2 className="text-base font-medium mb-4">Account</h2>
          {isLoading ? (
            <div className="h-[100px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : isLoggedIn ? (
            <MobileProfileMenu session={session} />
          ) : (
            <div className="flex flex-col space-y-3">
              <Button variant="outline" className="w-full border-border/60 hover:bg-primary/5 hover:text-primary" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button className="w-full bg-primary hover:bg-primary/90 text-white" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </SheetContent>
  </Sheet>
)

// Mobile profile menu component with improved styling
const MobileProfileMenu = ({ session }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-3 mb-4">
      {session?.user?.avatarUrl || session?.user?.image ? (
        <div className="h-10 w-10 rounded-full overflow-hidden border border-border/40">
          <img 
            src={session.user.avatarUrl || session.user.image} 
            alt={session.user.name || "Profile"} 
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-border/40">
          <User className="h-5 w-5" />
        </div>
      )}
      <div>
        <p className="font-medium">{session?.user?.name || "User"}</p>
        <p className="text-xs text-muted-foreground">{session?.user?.email || "user@example.com"}</p>
      </div>
    </div>
    
    <nav className="space-y-3">
      <Link 
        href="/dashboard" 
        className="block text-sm transition-colors hover:text-primary py-1"
      >
        Dashboard
      </Link>
      <Link 
        href="/settings"
        className="block text-sm transition-colors hover:text-primary py-1"
      >
        Settings
      </Link>
    </nav>
    
    <Button 
      variant="outline" 
      size="sm" 
      className="mt-4 w-full border-border/60 hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
      onClick={() => signOut()}
    >
      Logout
    </Button>
  </div>
)

// Profile dropdown component for logged-in users with improved styling
const ProfileDropdown = ({ session }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full border border-border/40 hover:border-primary/20 hover:bg-primary/5 cursor-pointer">
          {session?.user?.avatarUrl || session?.user?.image ? (
            <img 
              src={session.user.avatarUrl || session.user.image} 
              alt={session.user.name || "Profile"} 
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <User className="h-5 w-5 text-foreground" />
          )}
          <span className="sr-only">Open profile menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-border/40">
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium leading-none">
            {session?.user?.name || "User"}
          </p>
          <p className="text-xs leading-none text-muted-foreground">
            {session?.user?.email || "user@example.com"}
          </p>
        </div>
        <DropdownMenuSeparator className="bg-border/40" />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer hover:text-primary">Dashboard</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer hover:text-primary">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/40" />
        <DropdownMenuItem 
          className="cursor-pointer hover:text-primary" 
          onClick={() => signOut()}
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default Navbar