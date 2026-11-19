import { useEffect, useRef, useState } from 'react'
import { Mic, Cpu, Server, Sliders, Volume2, Radio, ArrowRight, type LucideIcon } from 'lucide-react'

interface FlowNodeProps {
  icon: LucideIcon
  label: string
  sublabel?: string
  color: string
  delay: number
}

const FlowNode = ({ icon: Icon, label, sublabel, color, delay }: FlowNodeProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)

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
      { threshold: 0.3 }
    )

    if (nodeRef.current) {
      observer.observe(nodeRef.current)
    }

    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={nodeRef}
      className={`
        flex flex-col items-center
        transition-all duration-500
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
      `}
    >
      <div 
        className={`
          w-16 h-16 rounded-xl flex items-center justify-center mb-3
          ${color}
        `}
      >
        <Icon className="w-8 h-8 text-slate-900" />
      </div>
      <span className="text-sm font-medium text-slate-200 text-center">{label}</span>
      {sublabel && (
        <span className="text-xs text-slate-500 text-center mt-1">{sublabel}</span>
      )}
    </div>
  )
}

const DataFlowSection = () => {
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

  const flowNodes = [
    { icon: Mic, label: 'Choristers', sublabel: 'Voice Input', color: 'bg-pink-400' },
    { icon: Cpu, label: 'Client App', sublabel: 'Local Processing', color: 'bg-violet-400' },
    { icon: Server, label: 'Edge Server', sublabel: 'Nearest Node', color: 'bg-sky-400' },
    { icon: Sliders, label: 'Section Mix', sublabel: 'Micro-Mixing', color: 'bg-indigo-400' },
    { icon: Cpu, label: 'Conductor Sync', sublabel: 'Timing Anchor', color: 'bg-amber-400' },
    { icon: Volume2, label: 'Live Mix', sublabel: 'Stereo Output', color: 'bg-emerald-400' },
    { icon: Radio, label: 'PA/Recording', sublabel: 'Final Output', color: 'bg-rose-400' },
  ]

  return (
    <section id="dataflow" ref={sectionRef} className="relative py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/20 mb-6">
            <ArrowRight className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-400 font-medium">Data Flow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
            From Voice to Sound System
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A simplified view of how audio flows through the ChoirLive system.
          </p>
        </div>

        {/* Flow Diagram */}
        <div 
          className={`
            glass-card rounded-2xl p-8 lg:p-12
            transition-all duration-700
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          {/* Desktop Flow */}
          <div className="hidden lg:flex items-center justify-between gap-2">
            {flowNodes.map((node, index) => (
              <div key={index} className="flex items-center gap-2">
                <FlowNode {...node} delay={index * 150} />
                {index < flowNodes.length - 1 && (
                  <div className="flex items-center mx-2">
                    <ArrowRight className="w-5 h-5 text-slate-600 animate-pulse" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile Flow */}
          <div className="lg:hidden space-y-6">
            {flowNodes.map((node, index) => (
              <div key={index} className="flex items-center gap-4">
                <FlowNode {...node} delay={index * 100} />
                {index < flowNodes.length - 1 && (
                  <div className="flex-1 flex justify-center">
                    <ArrowRight className="w-5 h-5 text-slate-600 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Flow Description */}
          <div className="mt-12 pt-8 border-t border-slate-700/50">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200">1. Capture & Process</h4>
                <p className="text-sm text-slate-400">
                  Each chorister's voice is captured, processed locally for noise floor control, 
                  echo cancellation, and gain normalization.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200">2. Transport & Mix</h4>
                <p className="text-sm text-slate-400">
                  Audio travels via UDP/WebRTC to the nearest edge server, where sections are 
                  grouped and micro-mixed with latency alignment.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-200">3. Sync & Output</h4>
                <p className="text-sm text-slate-400">
                  The conductor provides the timing anchor. Final mix goes to stereo output 
                  or multi-track recording.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'End-to-End Latency', value: '<40ms' },
            { label: 'Packet Loss Tolerance', value: '5%' },
            { label: 'Audio Quality', value: '48kHz' },
            { label: 'Sync Accuracy', value: '±5ms' },
          ].map((metric, index) => (
            <div 
              key={index}
              className={`
                glass-card rounded-lg p-4 text-center
                transition-all duration-700
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: `${800 + index * 100}ms` }}
            >
              <div className="font-mono text-2xl font-bold text-sky-400 mb-1">
                {metric.value}
              </div>
              <div className="text-xs text-slate-500">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DataFlowSection
