import { Music, Github, Twitter, Mail, Heart } from 'lucide-react'
import ConnectionStatus from '@/components/ConnectionStatus'

const FooterSection = () => {
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Architecture', href: '#architecture' },
        { label: 'Specs', href: '#specs' },
        { label: 'Data Flow', href: '#dataflow' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: '#' },
        { label: 'API Reference', href: '#' },
        { label: 'Tutorials', href: '#' },
        { label: 'Blog', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#' },
        { label: 'Contact', href: '#' },
        { label: 'Privacy', href: '#' },
        { label: 'Terms', href: '#' },
      ],
    },
  ]

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <footer className="relative bg-slate-900 border-t border-slate-800">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            {/* Logo */}
            <a 
              href="#" 
              className="inline-flex items-center gap-2 mb-6"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-400 flex items-center justify-center">
                <Music className="w-5 h-5 text-slate-900" />
              </div>
              <span className="font-semibold text-xl text-slate-100">
                Choir<span className="text-sky-400">Sync</span>
              </span>
            </a>

            <p className="text-slate-400 mb-6 max-w-sm">
              Ultra-low latency audio platform designed for synchronous choir singing. 
              Real rehearsals, real-time, anywhere.
            </p>

            {/* Connection Status */}
            <div className="inline-flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <ConnectionStatus latency={24} isConnected={true} />
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4 mt-6">
              <a 
                href="#" 
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-sky-400 hover:bg-slate-700 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-sky-400 hover:bg-slate-700 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-sky-400 hover:bg-slate-700 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map((column, index) => (
            <div key={index}>
              <h4 className="font-semibold text-slate-200 mb-4">{column.title}</h4>
              <ul className="space-y-3">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        if (link.href.startsWith('#')) {
                          e.preventDefault()
                          scrollToSection(link.href)
                        }
                      }}
                      className="text-slate-400 hover:text-sky-400 transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {currentYear} ChoirSync. All rights reserved.
            </p>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-rose-400 fill-rose-400" /> for choirs worldwide
            </p>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-slate-500">All Systems Operational</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-slate-600">|</span>
                <span className="text-slate-500">v2.1.0</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-600">Latency: <span className="text-green-400 font-mono">24ms</span></span>
              <span className="text-slate-600">Uptime: <span className="text-sky-400 font-mono">99.9%</span></span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default FooterSection
