import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'Architecture', href: '#architecture' },
    { label: 'Features', href: '#features' },
    { label: 'Specs', href: '#specs' },
    { label: 'Data Flow', href: '#dataflow' },
  ]

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a 
            href="#" 
            className="flex items-center gap-2 group"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-400 flex items-center justify-center group-hover:shadow-glow transition-shadow">
              <img src={`${import.meta.env.BASE_URL}choir-mark.svg`} alt="" className="w-8 h-8" />
            </div>
            <span className="font-semibold text-lg text-slate-100">
              Choir<span className="text-sky-400">Live</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-100 transition-colors rounded-md hover:bg-slate-800/50"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button 
              className="bg-sky-400 hover:bg-sky-500 text-slate-900 font-medium"
              onClick={() => scrollToSection('#architecture')}
            >
              Start Rehearsal
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-slate-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-700/50">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="px-4 py-3 text-left text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-md transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <Button 
                className="mt-2 bg-sky-400 hover:bg-sky-500 text-slate-900 font-medium"
                onClick={() => scrollToSection('#architecture')}
              >
                Start Rehearsal
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation
