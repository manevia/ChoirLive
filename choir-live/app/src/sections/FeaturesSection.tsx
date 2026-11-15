import { useEffect, useRef, useState } from 'react'
import { Zap, Users, Mic, Clock, Globe, Headphones, Shield, Radio, type LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  delay: number
}

const FeatureCard = ({ icon: Icon, title, description, delay }: FeatureCardProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true)
          }, delay)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={cardRef}
      className={`
        group relative p-8 rounded-xl 
        bg-slate-800/50 border border-slate-700/50
        hover:border-sky-400/50 hover:bg-slate-800/80
        transition-all duration-500
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-400/5 to-indigo-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-sky-400/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-sky-400/20 transition-all duration-300">
          <Icon className="w-7 h-7 text-sky-400" />
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-semibold text-slate-100 mb-3">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
}

const FeaturesSection = () => {
  const features = [
    {
      icon: Zap,
      title: 'Ultra-Low Latency',
      description: '5-15ms buffer with regional edge servers. Experience true synchronous singing without the awkward delay that ruins ensemble.',
    },
    {
      icon: Users,
      title: 'Section-Based Mixing',
      description: 'Hear your section clearly while staying connected to the full choir. SATB mixing with independent volume controls for each voice part.',
    },
    {
      icon: Mic,
      title: 'Music-Preserving Audio',
      description: 'No aggressive noise suppression that kills harmonics. Our pipeline preserves the full musical spectrum for rich, natural sound.',
    },
    {
      icon: Clock,
      title: 'Conductor Sync',
      description: 'Everyone syncs to one musical authority. The conductor sets the tempo, and all choristers follow in perfect unison.',
    },
    {
      icon: Globe,
      title: 'Global Edge Network',
      description: 'Connect to the nearest regional node for minimal latency. Our distributed infrastructure spans continents for worldwide access.',
    },
    {
      icon: Headphones,
      title: 'Reference Tracks',
      description: 'Play backing tracks, click tracks, or reference recordings that all members hear in perfect synchronization.',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'End-to-end encryption for all audio streams. Your rehearsals remain private and secure, with no data mining or tracking.',
    },
    {
      icon: Radio,
      title: 'Hybrid Ready',
      description: 'Integrate with physical sound systems via USB, Dante, or AVB. Perfect for hybrid rehearsals with both in-person and remote singers.',
    },
  ]

  return (
    <section id="features" className="relative py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-400/10 border border-indigo-400/20 mb-6">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-400 font-medium">Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
            Built for Choirs, Not Meetings
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Every feature is designed with the unique needs of choral singing in mind. 
            No compromises, no workarounds.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              {...feature}
              delay={index * 100}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-slate-500 mb-4">
            Ready to transform your choir rehearsals?
          </p>
          <button 
            onClick={() => {
              const element = document.querySelector('#specs')
              if (element) element.scrollIntoView({ behavior: 'smooth' })
            }}
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-medium transition-colors"
          >
            View Technical Specifications
            <span className="text-lg">→</span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
