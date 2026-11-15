import { useState } from 'react'
import { 
  Mic, 
  Globe, 
  Server, 
  Sliders, 
  Volume2, 
  Radio, 
  Database,
  Users,
  Zap,
  Music
} from 'lucide-react'
import LayerCard from '@/components/LayerCard'

const ArchitectureSection = () => {
  const [expandedLayer, setExpandedLayer] = useState<number | null>(1)

  const layers = [
    {
      number: 1,
      title: 'Client Layer',
      subtitle: 'Choristers & Conductor',
      icon: Mic,
      features: [
        { text: 'Mic Input (Voice)' },
        { text: 'Optional Camera' },
        { 
          text: 'Local Audio Processing',
          subItems: [
            'Noise floor control (not suppression)',
            'Echo cancellation',
            'Gain normalization'
          ]
        },
        { text: 'Ultra-Low Buffer (5–15 ms)' },
        { text: 'Section Assignment (SATB)' },
      ],
      outputs: [
        { text: 'Conductor Audio' },
        { text: 'Section Audio' },
        { text: 'Reference Track / Click' },
      ],
      note: '🎵 Music-preserving audio pipeline. No aggressive noise suppression. No voice-priority muting.',
    },
    {
      number: 2,
      title: 'Network Transport Layer',
      subtitle: 'Critical Path',
      icon: Globe,
      features: [
        { text: 'UDP / WebRTC (Audio-Only Priority)' },
        { text: 'Opus Codec (Low Bitrate, High Quality)' },
        { text: 'Adaptive Bitrate (16–64 kbps)' },
        { text: 'Packet Loss Tolerance' },
        { text: 'No Jitter Accumulation' },
      ],
      note: '⚡ TCP = delays. UDP/WebRTC = speed. Audio never waits for "perfect" packets.',
    },
    {
      number: 3,
      title: 'Edge Server Layer',
      subtitle: 'Regional Nodes',
      icon: Server,
      features: [
        { text: 'Africa West Node' },
        { text: 'Africa East Node' },
        { text: 'Europe Node' },
        { text: 'North America Node' },
        { 
          text: 'Functions',
          subItems: [
            'Session Management',
            'Section Grouping',
            'Micro-Mixing (Per Section)',
            'Latency Alignment (±5–10 ms)',
            'Conductor Sync Anchor'
          ]
        },
      ],
      note: '🌍 Choristers connect to nearest node, not global server. Single biggest latency reducer.',
    },
    {
      number: 4,
      title: 'Conductor Sync & Control Layer',
      subtitle: 'Master Timing Authority',
      icon: Sliders,
      features: [
        { text: 'Master Tempo Anchor' },
        { text: 'Beat / Cue Injection' },
        { text: 'Section Volume Control' },
        { text: 'Mute / Solo Sections' },
        { text: 'Rehearsal Markers' },
      ],
      outputs: [
        { text: 'Global Timing Reference' },
      ],
      note: '🎼 Everyone syncs to one musical authority, not to each other. Mirrors real-world choir leadership.',
    },
    {
      number: 5,
      title: 'Audio Mix & Output Layer',
      subtitle: 'Live Choir Mix Engine',
      icon: Volume2,
      features: [
        { text: 'Soprano Stem' },
        { text: 'Alto Stem' },
        { text: 'Tenor Stem' },
        { text: 'Bass Stem' },
        { 
          text: 'Processing',
          subItems: [
            'Light EQ',
            'Dynamic Balance',
            'No Time Stretching'
          ]
        },
      ],
      outputs: [
        { text: 'Stereo Master Mix' },
        { text: 'Multi-Track (for mixers/recording)' },
      ],
    },
    {
      number: 6,
      title: 'Physical Sound System Integration',
      subtitle: 'Audio Interface / Digital Mixer',
      icon: Radio,
      features: [
        { text: 'USB / Dante / AVB' },
        { text: 'Separate Section Channels' },
        { text: 'Live PA Output' },
        { text: 'Recording Output' },
      ],
      note: '🎤 Church PA systems, Concert halls, Hybrid live + remote rehearsals',
    },
    {
      number: 7,
      title: 'Backend Services',
      subtitle: 'Non-Real-Time',
      icon: Database,
      features: [
        { text: 'User Accounts' },
        { text: 'Choir & Section Management' },
        { text: 'Rehearsal Scheduling' },
        { text: 'Recording Storage' },
        { text: 'Analytics (Latency, Dropouts)' },
      ],
      note: '⚠️ NEVER touches live audio path. Separation keeps live audio fast and clean.',
    },
  ]

  const toggleLayer = (num: number) => {
    setExpandedLayer(expandedLayer === num ? null : num)
  }

  return (
    <section id="architecture" className="relative py-24 bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-400/10 border border-sky-400/20 mb-6">
            <Zap className="w-4 h-4 text-sky-400" />
            <span className="text-sm text-sky-400 font-medium">System Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
            Low-Latency, Choir-First Design
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A specialized architecture built from the ground up for synchronous choir singing, 
            prioritizing ultra-low latency and music-preserving audio processing.
          </p>
        </div>

        {/* Architecture Layers */}
        <div className="space-y-8 relative">
          {/* Vertical Connection Line */}
          <div className="absolute left-0 top-8 bottom-8 w-px bg-gradient-to-b from-sky-400/50 via-indigo-400/50 to-sky-400/50" />

          {layers.map((layer, index) => (
            <LayerCard
              key={layer.number}
              {...layer}
              isExpanded={expandedLayer === layer.number}
              onToggle={() => toggleLayer(layer.number)}
              delay={index * 100}
            />
          ))}
        </div>

        {/* Key Design Principles */}
        <div className="mt-16 glass-card rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-indigo-400/10">
              <Music className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100">
              Key Design Principles
            </h3>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '✓', text: 'No central global server' },
              { icon: '✓', text: 'Conductor-anchored timing' },
              { icon: '✓', text: 'Section-based listening' },
              { icon: '✓', text: 'Audio-only priority mode' },
              { icon: '✓', text: 'Low-bandwidth tolerance' },
              { icon: '✓', text: 'Choir-first (not meeting-first)' },
            ].map((principle, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50"
              >
                <span className="text-green-400 font-bold">{principle.icon}</span>
                <span className="text-slate-300">{principle.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What This Enables */}
        <div className="mt-8 glass-card rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-emerald-400/10">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100">
              What This Architecture Enables
            </h3>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Real choir rehearsals online',
              'Faith-based choirs globally',
              'University music departments',
              'Hybrid worship & concerts',
              'Inclusion of rural singers',
              'International collaborations',
            ].map((item, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ArchitectureSection
