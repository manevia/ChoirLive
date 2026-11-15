import { useEffect, useRef } from 'react'

interface AudioWaveformProps {
  className?: string
}

const AudioWaveform = ({ className = '' }: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const timeRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const drawWaveform = () => {
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      const centerY = height / 2

      ctx.clearRect(0, 0, width, height)

      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0)
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.3)')
      gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.8)')
      gradient.addColorStop(1, 'rgba(129, 140, 248, 0.3)')

      // Draw multiple waveforms
      const waves = [
        { amplitude: 30, frequency: 0.01, speed: 2, opacity: 0.8 },
        { amplitude: 20, frequency: 0.015, speed: 1.5, opacity: 0.5 },
        { amplitude: 15, frequency: 0.008, speed: 2.5, opacity: 0.3 },
      ]

      waves.forEach((wave, index) => {
        ctx.beginPath()
        ctx.strokeStyle = index === 0 ? gradient : `rgba(56, 189, 248, ${wave.opacity})`
        ctx.lineWidth = index === 0 ? 2 : 1.5

        for (let x = 0; x < width; x += 2) {
          const phase = timeRef.current * wave.speed * 0.01
          const y = centerY + 
            Math.sin(x * wave.frequency + phase) * wave.amplitude +
            Math.sin(x * wave.frequency * 2 + phase * 1.5) * (wave.amplitude * 0.5)
          
          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        ctx.stroke()
      })

      // Add glow effect
      ctx.shadowColor = 'rgba(56, 189, 248, 0.5)'
      ctx.shadowBlur = 10

      timeRef.current += 1
      animationRef.current = requestAnimationFrame(drawWaveform)
    }

    drawWaveform()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-24 ${className}`}
      style={{ display: 'block' }}
    />
  )
}

export default AudioWaveform
