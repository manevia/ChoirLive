import ChoirRoom from './ChoirRoom'
import ChoirCoreRoom from './ChoirCoreRoom'
import SfuChoirRoom from './SfuChoirRoom'
import OutputDesk from './OutputDesk'
import { useEffect, useRef, useState } from 'react'
import './App.css'
import HeroSection from './sections/HeroSection'
import ArchitectureSection from './sections/ArchitectureSection'
import FeaturesSection from './sections/FeaturesSection'
import TechSpecsSection from './sections/TechSpecsSection'
import DataFlowSection from './sections/DataFlowSection'
import FooterSection from './sections/FooterSection'
import Navigation from './components/Navigation'
import ScrollProgress from './components/ScrollProgress'

function App() {
  const [isLoaded, setIsLoaded] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Trigger load animation
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div 
      ref={mainRef}
      className={`min-h-screen bg-slate-900 text-slate-100 transition-opacity duration-500 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <ScrollProgress />
      <Navigation />
      
      <main className="relative">
        {/* Background Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Gradient Orbs */}
          <div className="absolute top-20 left-10 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/3 right-20 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl animate-float" />
          
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(56, 189, 248, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(56, 189, 248, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />
        </div>

        {/* Content Sections */}
        <div className="relative z-10">
          <HeroSection />
          <ChoirCoreRoom />
          <SfuChoirRoom />
          <OutputDesk />
          <ChoirRoom />
          <ArchitectureSection />
          <FeaturesSection />
          <TechSpecsSection />
          <DataFlowSection />
          <FooterSection />
        </div>
      </main>
    </div>
  )
}

export default App
