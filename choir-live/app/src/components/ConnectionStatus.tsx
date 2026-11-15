import { useEffect, useState } from 'react'
import { Activity, Wifi, WifiOff } from 'lucide-react'

interface ConnectionStatusProps {
  latency?: number
  isConnected?: boolean
  className?: string
}

const ConnectionStatus = ({ 
  latency = 25, 
  isConnected = true,
  className = '' 
}: ConnectionStatusProps) => {
  const [displayLatency, setDisplayLatency] = useState(latency)
  const [status, setStatus] = useState<'excellent' | 'good' | 'poor'>('excellent')

  useEffect(() => {
    // Simulate slight latency fluctuations
    const interval = setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 4
      const newLatency = Math.max(15, Math.min(45, latency + fluctuation))
      setDisplayLatency(Math.round(newLatency))
      
      if (newLatency < 30) {
        setStatus('excellent')
      } else if (newLatency < 40) {
        setStatus('good')
      } else {
        setStatus('poor')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [latency])

  const statusConfig = {
    excellent: {
      color: 'text-green-400',
      bgColor: 'bg-green-400/20',
      label: 'EXCELLENT',
      pulseColor: 'bg-green-400',
    },
    good: {
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/20',
      label: 'GOOD',
      pulseColor: 'bg-amber-400',
    },
    poor: {
      color: 'text-red-400',
      bgColor: 'bg-red-400/20',
      label: 'POOR',
      pulseColor: 'bg-red-400',
    },
  }

  const config = statusConfig[status]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Connection Icon */}
      <div className={`p-2 rounded-lg ${config.bgColor}`}>
        {isConnected ? (
          <Wifi className={`w-4 h-4 ${config.color}`} />
        ) : (
          <WifiOff className="w-4 h-4 text-red-400" />
        )}
      </div>

      {/* Latency Display */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Activity className={`w-3 h-3 ${config.color}`} />
          <span className="font-mono text-sm font-medium text-slate-200">
            {displayLatency}ms
          </span>
        </div>
        <span className={`text-xs ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Pulse Indicator */}
      <div className={`relative w-3 h-3 ${config.pulseColor} rounded-full`}>
        <div className={`absolute inset-0 ${config.pulseColor} rounded-full animate-ping opacity-75`} />
      </div>
    </div>
  )
}

export default ConnectionStatus
