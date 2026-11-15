import { useEffect, useRef, useState } from 'react'
import { Check, X, Cpu, Wifi, HardDrive, Settings } from 'lucide-react'

interface SpecItemProps {
  label: string
  value: string
  icon?: React.ReactNode
}

const SpecItem = ({ label, value, icon }: SpecItemProps) => (
  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
    <div className="flex items-center gap-3">
      {icon && <span className="text-slate-500">{icon}</span>}
      <span className="text-slate-300">{label}</span>
    </div>
    <span className="font-mono text-sky-400 font-medium">{value}</span>
  </div>
)

interface LatencyBarProps {
  label: string
  latency: string
  width: number
  color: string
  isBest?: boolean
  delay: number
}

const LatencyBar = ({ label, latency, width, color, isBest, delay }: LatencyBarProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

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
      { threshold: 0.5 }
    )

    if (barRef.current) {
      observer.observe(barRef.current)
    }

    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={barRef} className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-sm ${isBest ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
          {label}
        </span>
        <span className={`font-mono text-sm ${isBest ? 'text-sky-400 font-bold' : 'text-slate-500'}`}>
          {latency}
        </span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ 
            width: isVisible ? `${width}%` : '0%',
          }}
        />
      </div>
    </div>
  )
}

const TechSpecsSection = () => {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const latencyData = [
    { label: 'Standard Video Call', latency: '150-300ms', width: 100, color: 'bg-red-500/70' },
    { label: 'Music Lesson Apps', latency: '80-150ms', width: 60, color: 'bg-amber-500/70' },
    { label: 'ChoirSync', latency: '20-40ms', width: 20, color: 'bg-sky-400', isBest: true },
    { label: 'In-Person Rehearsal', latency: '<10ms', width: 8, color: 'bg-emerald-400' },
  ]

  const audioSpecs = [
    { label: 'Codec', value: 'Opus (VoIP optimized)', icon: <Cpu className="w-4 h-4" /> },
    { label: 'Bitrate', value: '16-64 kbps adaptive', icon: <Wifi className="w-4 h-4" /> },
    { label: 'Sample Rate', value: '48kHz', icon: <HardDrive className="w-4 h-4" /> },
    { label: 'Buffer', value: '5-15ms configurable', icon: <Settings className="w-4 h-4" /> },
    { label: 'Transport', value: 'UDP/WebRTC', icon: <Wifi className="w-4 h-4" /> },
  ]

  const requirements = [
    { label: 'Chrome', value: '90+', met: true },
    { label: 'Edge', value: '90+', met: true },
    { label: 'Firefox', value: '88+', met: true },
    { label: 'Safari', value: '14+', met: true },
  ]

  const comparisons = [
    { feature: 'Ultra-low latency', choirsync: true, zoom: false, teams: false },
    { feature: 'Section-based mixing', choirsync: true, zoom: false, teams: false },
    { feature: 'Music-preserving audio', choirsync: true, zoom: false, teams: false },
    { feature: 'Conductor sync anchor', choirsync: true, zoom: false, teams: false },
    { feature: 'Reference track sync', choirsync: true, zoom: false, teams: false },
    { feature: 'Edge server network', choirsync: true, zoom: false, teams: false },
    { feature: 'Video support', choirsync: true, zoom: true, teams: true },
    { feature: 'Screen sharing', choirsync: false, zoom: true, teams: true },
  ]

  return (
    <section id="specs" ref={sectionRef} className="relative py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/10 border border-emerald-400/20 mb-6">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Technical Specs</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
            The Numbers That Matter
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            See how ChoirSync compares to standard video conferencing and other solutions.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Latency Comparison */}
          <div 
            className={`
              glass-card rounded-xl p-8
              transition-all duration-700
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
            `}
          >
            <h3 className="text-xl font-semibold text-slate-100 mb-6">
              Latency Comparison
            </h3>
            <div className="space-y-6">
              {latencyData.map((item, index) => (
                <LatencyBar
                  key={index}
                  {...item}
                  delay={index * 150}
                />
              ))}
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Lower latency = better synchronization. Above ~50ms, singers experience noticeable delay.
            </p>
          </div>

          {/* Audio Specifications */}
          <div 
            className={`
              glass-card rounded-xl p-8
              transition-all duration-700 delay-200
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
            `}
          >
            <h3 className="text-xl font-semibold text-slate-100 mb-6">
              Audio Specifications
            </h3>
            <div className="space-y-3">
              {audioSpecs.map((spec, index) => (
                <SpecItem key={index} {...spec} />
              ))}
            </div>
          </div>

          {/* Browser Requirements */}
          <div 
            className={`
              glass-card rounded-xl p-8
              transition-all duration-700 delay-300
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
            `}
          >
            <h3 className="text-xl font-semibold text-slate-100 mb-6">
              Browser Requirements
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {requirements.map((req, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50"
                >
                  <span className="text-slate-300">{req.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sky-400">{req.value}</span>
                    {req.met ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <X className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 rounded-lg bg-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Internet (Upload)</span>
                <span className="font-mono text-sky-400">1 Mbps minimum</span>
              </div>
            </div>
          </div>

          {/* Feature Comparison */}
          <div 
            className={`
              glass-card rounded-xl p-8
              transition-all duration-700 delay-400
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
            `}
          >
            <h3 className="text-xl font-semibold text-slate-100 mb-6">
              Feature Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 text-sm font-medium text-slate-400">Feature</th>
                    <th className="text-center py-3 text-sm font-medium text-sky-400">ChoirSync</th>
                    <th className="text-center py-3 text-sm font-medium text-slate-500">Zoom</th>
                    <th className="text-center py-3 text-sm font-medium text-slate-500">Teams</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((item, index) => (
                    <tr key={index} className="border-b border-slate-800">
                      <td className="py-3 text-sm text-slate-300">{item.feature}</td>
                      <td className="text-center py-3">
                        {item.choirsync ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-400/50 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-3">
                        {item.zoom ? (
                          <Check className="w-5 h-5 text-green-400/50 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-400/30 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-3">
                        {item.teams ? (
                          <Check className="w-5 h-5 text-green-400/50 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-400/30 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TechSpecsSection
