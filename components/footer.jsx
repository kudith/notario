"use client"

import Link from "next/link"
import { Github } from "lucide-react"

const Footer = () => {
  // Get current year for copyright
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-border/40 bg-card/60 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Simple footer content */}
        <div className="flex flex-col items-center md:flex-row md:justify-between gap-6">
          {/* Logo and project info */}
          <div className="flex items-center space-x-2">
            <FooterLogo />
            <div>
              <h3 className="font-bold">Notar.io</h3>
              <p className="text-xs text-muted-foreground">Digital Signature System</p>
            </div>
          </div>
          
          {/* Links - simplified for academic project */}
          <div className="flex items-center space-x-6">
            <FooterLink href="/">Home</FooterLink>
            <FooterLink href="/sign">Sign</FooterLink>
            <FooterLink href="/verify">Verify</FooterLink>
            <FooterLink href="/lookup">Lookup</FooterLink>
          </div>
          
          {/* Academic project info */}
          <div className="flex items-center space-x-2">
            <a 
              href="https://github.com/yourusername/notario"
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors"
              aria-label="GitHub Repository"
            >
              <Github size={16} />
              <span className="text-sm">Source Code</span>
            </a>
          </div>
        </div>

        {/* Academic footer info */}
        <div className="mt-8 pt-4 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <div>
            <p>Tugas Mata Kuliah Keamanan Informasi &copy; {currentYear}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <span>Sistem Validasi Dokumen Digital</span>
            <span>&middot;</span>
            <span>RSA/ECDSA + SHA-256</span>
          </div>
          
          <div>
            <p>Terakhir diperbarui: 2025-05-18 12:17:07</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Minimalist logo for footer
const FooterLogo = () => (
  <div className="relative w-7 h-7 flex items-center justify-center">
    <svg viewBox="0 0 24 24" width="20" height="20" className="text-primary">
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

// Simple footer link component
const FooterLink = ({ href, children }) => (
  <Link 
    href={href}
    className="text-sm text-muted-foreground hover:text-primary transition-colors"
  >
    {children}
  </Link>
)

export default Footer