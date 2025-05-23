"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Menu, User, Home, FileSignature, CheckSquare, LogOut, LayoutDashboard } from "lucide-react"

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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import ThemeToggle from "@/components/theme-toggle"

// Navigation items configuration with icons
const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Sign Document", href: "/sign", icon: FileSignature },
  { name: "Verify", href: "/verify", icon: CheckSquare },
]

const Navbar = () => {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const isLoggedIn = status === "authenticated"
  const isLoading = status === "loading"
  const [scrolled, setScrolled] = React.useState(false)

  // Handle scroll effect
  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      {/* Main Navbar */}
      <header className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200",
        scrolled ? "border-border/40 shadow-sm" : "border-transparent"
      )}>
        <div className="container mx-auto flex h-14 sm:h-16 items-center px-4 max-w-5xl">
          {/* Brand Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2 group">
              <BrandLogo />
              <BrandText />
            </Link>
          </div>
          
          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex flex-1 justify-center">
            <nav>
              <ul className="flex items-center space-x-6 lg:space-x-8">
                {navItems.map((item) => (
                  <li key={item.name}>
                    <NavLink item={item} isActive={pathname === item.href} />
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          
          {/* Authentication Section - Right aligned */}
          <div className="hidden md:flex items-center justify-end ml-auto space-x-4">
            <ThemeToggle />
            <AuthSection isLoading={isLoading} isLoggedIn={isLoggedIn} session={session} />
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden ml-auto flex items-center space-x-2">
            <ThemeToggle />
            <MobileMenu 
              isLoading={isLoading} 
              isLoggedIn={isLoggedIn} 
              session={session} 
              pathname={pathname}
            />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-t border-border/40 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 px-2 transition-colors",
                pathname === item.href 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 mb-1",
                pathname === item.href && "text-primary"
              )} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          ))}
          {isLoggedIn ? (
            <BottomNavProfileItem session={session} />
          ) : (
            <Link
              href="/login"
              className="flex flex-col items-center justify-center flex-1 py-1 px-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Account</span>
            </Link>
          )}
        </div>
      </div>
    </>
  )
}

// Bottom nav profile item component
const BottomNavProfileItem = ({ session }) => (
  <DropdownMenu>
    <DropdownMenuTrigger className="flex flex-col items-center justify-center flex-1 py-1 px-2 text-muted-foreground hover:text-foreground transition-colors">
      {session?.user?.avatarUrl || session?.user?.image ? (
        <div className="w-6 h-6 rounded-full mb-1 border border-border/40 overflow-hidden">
          <img 
            src={session.user.avatarUrl || session.user.image} 
            alt="Profile" 
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <User className="h-5 w-5 mb-1" />
      )}
      <span className="text-xs font-medium">Profile</span>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56 border-border/40 mb-16">
      <div className="flex items-center space-x-3 p-2">
        {session?.user?.avatarUrl || session?.user?.image ? (
          <div className="h-8 w-8 rounded-full overflow-hidden border border-border/40">
            <img 
              src={session.user.avatarUrl || session.user.image} 
              alt={session.user.name || "Profile"} 
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-border/40">
            <User className="h-4 w-4" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium leading-none">{session?.user?.name || "User"}</p>
          <p className="text-xs leading-none text-muted-foreground mt-1">{session?.user?.email || "user@example.com"}</p>
        </div>
      </div>
      <DropdownMenuSeparator className="bg-border/40" />
      <DropdownMenuItem asChild>
        <Link href="/dashboard" className="cursor-pointer flex items-center">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          <span>Dashboard</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-border/40" />
      <DropdownMenuItem 
        className="cursor-pointer flex items-center text-destructive hover:text-destructive" 
        onClick={() => signOut()}
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Logout</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

// Simple and minimalist brand logo component
const BrandLogo = () => (
  <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center overflow-hidden group-hover:opacity-90 transition-opacity">
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
    <span className="font-bold text-base sm:text-lg tracking-tight leading-none">
      Notar<span className="text-primary">.io</span>
    </span>
    <span className="text-[9px] sm:text-[10px] text-muted-foreground tracking-wide uppercase font-medium leading-tight">Digital Signature</span>
  </div>
)

// Enhanced navigation link component with better animation and active state
const NavLink = ({ item, isActive }) => (
  <Link 
    href={item.href}
    className={cn(
      "text-sm font-medium transition-colors py-2 px-1 relative group",
      isActive ? "text-primary" : "text-foreground hover:text-primary"
    )}
  >
    {item.name}
    <span className={cn(
      "absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300",
      isActive ? "w-full opacity-100" : "w-0 opacity-80 group-hover:w-full"
    )}></span>
  </Link>
)

// Authentication section component with improved styling
const AuthSection = ({ isLoading, isLoggedIn, session }) => {
  if (isLoading) {
    return <div className="h-9 flex items-center justify-end">
      <div className="w-5 h-5 border-2 border-t-transparent border-primary/40 rounded-full animate-spin"></div>
    </div>
  }
  
  if (isLoggedIn) {
    return <ProfileDropdown session={session} />
  }
  
  return (
    <div className="flex items-center">
      <Button variant="ghost" size="sm" asChild className="text-foreground hover:text-primary hover:bg-primary/5 transition-colors">
        <Link href="/login">Login</Link>
      </Button>
      <Button size="sm" asChild className="ml-2 bg-primary hover:bg-primary/90 text-white transition-colors">
        <Link href="/register">Register</Link>
      </Button>
    </div>
  )
}

// Mobile menu component with improved styling - Fixed with SheetTitle
const MobileMenu = ({ isLoading, isLoggedIn, session, pathname }) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon" className="hover:bg-primary/5 text-foreground hover:text-primary rounded-full">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
    </SheetTrigger>
    <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-background border-l border-border/40 p-0">
      <SheetHeader className="p-4 border-b border-border/40">
        <SheetTitle className="flex items-center space-x-3 text-left">
          <BrandLogo />
          <BrandText />
        </SheetTitle>
      </SheetHeader>
      
      <div className="flex flex-col h-[calc(100%-65px)] pb-safe-area-inset">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : isLoggedIn ? (
          <LoggedInMobileMenu session={session} pathname={pathname} />
        ) : (
          <LoggedOutMobileMenu pathname={pathname} />
        )}
      </div>
    </SheetContent>
  </Sheet>
)

// Logged in mobile menu content
const LoggedInMobileMenu = ({ session, pathname }) => (
  <div className="flex flex-col h-full">
    <div className="flex items-center p-4 border-b border-border/30 bg-muted/30">
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
      <div className="ml-3">
        <p className="font-medium">{session?.user?.name || "User"}</p>
        <p className="text-xs text-muted-foreground">{session?.user?.email || "user@example.com"}</p>
      </div>
    </div>
    
    <div className="flex-1 overflow-auto py-2 px-1">
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-3 text-sm transition-colors rounded-md",
              pathname === item.href 
                ? "bg-primary/10 text-primary font-medium" 
                : "hover:bg-muted/60"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        ))}
        
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 px-3 py-3 text-sm transition-colors rounded-md mt-2",
            pathname === "/dashboard" 
              ? "bg-primary/10 text-primary font-medium" 
              : "hover:bg-muted/60"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
      </nav>
    </div>
    
    <div className="p-4 border-t border-border/30 mt-auto">
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/5"
        onClick={() => signOut()}
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  </div>
)

// Logged out mobile menu content
const LoggedOutMobileMenu = ({ pathname }) => (
  <div className="flex flex-col h-full">
    <div className="flex-1 overflow-auto py-2 px-1">
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-3 text-sm transition-colors rounded-md",
              pathname === item.href 
                ? "bg-primary/10 text-primary font-medium" 
                : "hover:bg-muted/60"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
    
    <div className="p-4 border-t border-border/30 mt-auto">
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">Login</Link>
        </Button>
        <Button className="w-full bg-primary hover:bg-primary/90" asChild>
          <Link href="/register">Register</Link>
        </Button>
      </div>
    </div>
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
        <div className="flex items-center space-x-3 p-2">
          {session?.user?.avatarUrl || session?.user?.image ? (
            <div className="h-8 w-8 rounded-full overflow-hidden border border-border/40">
              <img 
                src={session.user.avatarUrl || session.user.image} 
                alt={session.user.name || "Profile"} 
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-border/40">
              <User className="h-4 w-4" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium leading-none">{session?.user?.name || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground mt-1">{session?.user?.email || "user@example.com"}</p>
          </div>
        </div>
        <DropdownMenuSeparator className="bg-border/40" />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer flex items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/40" />
        <DropdownMenuItem 
          className="cursor-pointer flex items-center text-destructive hover:text-destructive" 
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default Navbar