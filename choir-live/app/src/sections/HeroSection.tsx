import { useEffect, useState } from 'react'
import { Music, ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AudioWaveform from '@/components/AudioWaveform'

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  const scrollToArchitecture = () => {
    const element = document.querySelector('#architecture')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-hero-gradient" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large Gradient Orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, transparent 70%)',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(129, 140, 248, 0.3) 0%, transparent 70%)',
            animation: 'float 10s ease-in-out infinite reverse',
          }}
        />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(56, 189, 248, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(56, 189, 248, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo */}
        <div 
          className={`flex justify-center mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-400 flex items-center justify-center shadow-glow-lg">
              <Music className="w-10 h-10 text-slate-900" />
            </div>
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-2xl border-2 border-sky-400/30 animate-ping" />
          </div>
        </div>

        {/* Brand Name */}
        <h1 
          className={`text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          <span className="text-slate-100">Choir</span>
          <span className="text-gradient">Live</span>
        </h1>

        {/* Tagline */}
        <p 
          className={`text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-200 mb-4 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          Real-Time Choir Rehearsals. Anywhere.
        </p>

        {/* Subtitle */}
        <p 
          className={`text-lg text-slate-400 max-w-2xl mx-auto mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '800ms' }}
        >
          Ultra-low latency audio platform designed for synchronous singing. 
          No more "you go first, then I'll come in."
        </p>

        {/* Audio Waveform Visualization */}
        <div 
          className={`max-w-xl mx-auto mb-10 transition-all duration-700 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{ transitionDelay: '1000ms' }}
        >
          <AudioWaveform />
        </div>

        {/* CTA Buttons */}
        <div 
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '1200ms' }}
        >
          <Button 
            size="lg"
            className="bg-sky-400 hover:bg-sky-500 text-slate-900 font-semibold px-8 py-6 text-lg group"
            onClick={scrollToArchitecture}
          >
            Start Rehearsal
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            size="lg"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 px-8 py-6 text-lg"
            onClick={scrollToArchitecture}
          >
            <Play className="mr-2 w-5 h-5" />
            View System Architecture
          </Button>
        </div>

        {/* Stats */}
        <div 
          className={`mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '1400ms' }}
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-sky-400 font-mono">&lt;25ms</div>
            <div className="text-sm text-slate-500 mt-1">Latency</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-400 font-mono">SATB</div>
            <div className="text-sm text-slate-500 mt-1">Sections</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400 font-mono">48kHz</div>
            <div className="text-sm text-slate-500 mt-1">Audio</div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent" />
    </section>
  )
}

export default HeroSection
