import { useEffect, useRef, useState } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'

interface Feature {
  text: string
  subItems?: string[]
}

interface Output {
  text: string
}

interface LayerCardProps {
  number: number
  title: string
  subtitle: string
  features: Feature[]
  outputs?: Output[]
  note?: string
  icon: LucideIcon
  isExpanded?: boolean
  onToggle?: () => void
  delay?: number
}

const LayerCard = ({
  number,
  title,
  subtitle,
  features,
  outputs,
  note,
  icon: Icon,
  isExpanded = false,
  onToggle,
  delay = 0,
}: LayerCardProps) => {
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
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={cardRef}
      className={`relative group transition-all duration-500 ${
        isVisible 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 -translate-x-8'
      }`}
    >
      {/* Layer Number Badge */}
      <div className="absolute -left-4 -top-3 z-10">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-400 flex items-center justify-center shadow-glow">
          <span className="font-mono font-bold text-slate-900 text-sm">
            {number}
          </span>
        </div>
      </div>

      {/* Card */}
      <div 
        className={`
          glass-card rounded-lg p-6 pl-8 
          border-l-4 border-l-sky-400
          transition-all duration-300
          hover:border-l-indigo-400 hover:shadow-glow
          cursor-pointer
        `}
        onClick={onToggle}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-400/10">
              <Icon className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                {title}
              </h3>
              <p className="text-sm text-slate-400">{subtitle}</p>
            </div>
          </div>
          {onToggle && (
            <ChevronDown 
              className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>

        {/* Content */}
        <div className={`space-y-4 ${isExpanded ? '' : 'line-clamp-3'}`}>
          {/* Features */}
          <div className="space-y-2">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                <div>
                  <span className="text-sm text-slate-300">{feature.text}</span>
                  {feature.subItems && (
                    <ul className="mt-1 ml-4 space-y-1">
                      {feature.subItems.map((subItem, subIdx) => (
                        <li 
                          key={subIdx} 
                          className="text-xs text-slate-500 flex items-center gap-1"
                        >
                          <span className="w-1 h-1 rounded-full bg-slate-600" />
                          {subItem}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Outputs */}
          {outputs && outputs.length > 0 && (
            <div className="pt-3 border-t border-slate-700/50">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Outputs
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {outputs.map((output, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-slate-800 text-slate-300 rounded"
                  >
                    {output.text}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          {note && (
            <div className="pt-3 border-t border-slate-700/50">
              <p className="text-xs text-indigo-400 italic">{note}</p>
            </div>
          )}
        </div>
      </div>

      {/* Connection Line */}
      <div className="absolute left-0 top-full w-px h-4 bg-gradient-to-b from-sky-400/50 to-transparent" />
    </div>
  )
}

export default LayerCard
