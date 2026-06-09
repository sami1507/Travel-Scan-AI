'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Route, Shield, BookOpen, Search, DollarSign, Layers,
  CheckCircle2, MapPin, Plane, Brain,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ─── Reusable fade-in wrapper ─── */
function FadeIn({
  children,
  delay = 0,
  y = 30,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  )
}

/* ─── Navbar ─── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'shadow-xl border-b border-white/10' : ''
      }`}
      style={scrolled ? { background: 'rgba(15,23,41,0.92)', backdropFilter: 'blur(20px)' } : {}}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <Plane className="h-5 w-5" style={{ color: 'hsl(22,100%,62%)' }} />
            <span>TravelScan</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 font-medium"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="sm"
                className="font-semibold text-white border-0 shadow-lg hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
              >
                Start Free →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

/* ─── Hero ─── */
function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: '#0f1729' }}
    >
      {/* Orb 1 – sunset orange, top-right */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(255,133,51,0.15) 0%, transparent 70%)',
          top: '-10%', right: '-5%',
        }}
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Orb 2 – ocean teal, bottom-left */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 800, height: 800,
          background: 'radial-gradient(circle, rgba(13,171,215,0.10) 0%, transparent 70%)',
          bottom: '-15%', left: '-10%',
        }}
        animate={{ x: [0, -20, 30, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Orb 3 – sand gold, center */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(223,183,92,0.08) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        }}
        animate={{ x: [0, 20, -30, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.25,
        }}
      />

      <div className="relative z-10 container mx-auto px-4 lg:px-8 pt-24 pb-16 flex flex-col lg:flex-row items-center gap-14">
        {/* Left */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/80 mb-8"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <Plane className="h-4 w-4" style={{ color: 'hsl(22,100%,62%)' }} />
            <span className="font-medium">AI-Powered Travel Intelligence</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
          >
            Stop Guessing.<br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, hsl(22,100%,62%) 0%, hsl(43,74%,66%) 50%, hsl(199,89%,68%) 100%)' }}
            >
              Start Traveling Smart.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-white/65 mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0"
          >
            Your personal AI travel consultant.<br />
            Real routes. Honest advice. No booking pressure.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-8"
          >
            <Link href="/dashboard/analysis">
              <Button
                size="lg"
                className="h-14 px-8 text-base font-bold text-white border-0 shadow-xl hover:opacity-90 transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
              >
                Plan My Trip Free →
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base font-semibold bg-transparent text-white border-white/25 hover:bg-white/10 hover:text-white hover:border-white/40"
              >
                See How It Works ↓
              </Button>
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="text-white/45 text-sm flex items-center justify-center lg:justify-start gap-2"
          >
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
            Trusted by 2,400+ travelers • No credit card required
          </motion.p>
        </div>

        {/* Hero mock card – floating */}
        <motion.div
          className="flex-shrink-0 w-full max-w-[340px]"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        >
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.14)',
            }}
          >
            <div className="h-1.5" style={{ background: 'linear-gradient(90deg, hsl(22,100%,62%), hsl(38,92%,50%))' }} />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs text-white/45 font-medium uppercase tracking-wider">Best Match</span>
                  <h3 className="text-xl font-bold text-white mt-0.5">Slovenia</h3>
                </div>
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                >
                  1
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-white/55 text-sm mb-4">
                <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(22,100%,62%)' }} />
                <span>Ljubljana → Bled → Piran</span>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/45">Match Score</span>
                  <span className="text-lg font-bold" style={{ color: 'hsl(152,45%,60%)' }}>94/100</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'hsl(152,45%,48%)' }}
                    initial={{ width: 0 }}
                    animate={{ width: '94%' }}
                    transition={{ duration: 1.3, delay: 1.2, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {['Visa-free for EU passports, easy overland route', 'Budget-friendly: €80–120/day all in'].map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-white/65">
                    <span className="text-green-400 font-bold shrink-0 mt-0.5">✓</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center gap-1.5 text-xs text-white/35">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
                AI Verified • Real-time data • Updated today
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Problem / Solution ─── */
function ProblemSection() {
  const problems = [
    {
      icon: '😩',
      title: 'Travel sites overwhelm you',
      text: 'Hundreds of filters, ads, sponsored results. We cut through the noise with one honest AI recommendation.',
    },
    {
      icon: '💸',
      title: 'You book wrong, then regret',
      text: "Wrong season. Wrong budget. Wrong route. We tell you what travel blogs won't — the real downsides.",
    },
    {
      icon: '🗺️',
      title: 'Planning takes hours',
      text: 'Reddit threads, spreadsheets, 12 tabs open. Get a full route plan with itinerary in under 60 seconds.',
    },
  ]

  return (
    <section className="py-24 border-t border-white/10" style={{ background: '#0d1526' }}>
      <div className="container mx-auto px-4 lg:px-8">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Sound familiar?</h2>
          <p className="text-white/55 text-lg">TravelScan solves the three biggest travel planning problems.</p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {problems.map((p, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div
                className="rounded-2xl p-8 text-center h-full"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <div className="text-4xl mb-3">{p.icon}</div>
                <div className="text-2xl mb-3">→ ✅</div>
                <h3 className="text-lg font-bold text-white mb-3">{p.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{p.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── How It Works ─── */
function HowItWorksSection() {
  const steps = [
    { num: 1, title: "Tell us where you're from & when", desc: 'Departure city, passport, travel months' },
    { num: 2, title: 'Describe your ideal trip', desc: 'Budget, interests, trip structure, duration' },
    { num: 3, title: 'AI analyzes 20+ destinations', desc: 'Real-time web research + structured data + route logic' },
    { num: 4, title: 'Get your personalized route plan', desc: '3 ranked options with honest pros, cons, and itinerary' },
  ]

  return (
    <section id="how-it-works" className="py-24" style={{ background: '#0f1729' }}>
      <div className="container mx-auto px-4 lg:px-8">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Your AI consultant, in 4 steps</h2>
          <p className="text-white/55 text-lg">From question to full route plan in under 60 seconds.</p>
        </FadeIn>

        {/* Desktop horizontal timeline */}
        <div className="hidden md:block max-w-5xl mx-auto relative">
          <div
            className="absolute top-[22px] left-[12.5%] right-[12.5%] h-px"
            style={{ background: 'linear-gradient(90deg, hsl(22,100%,62%), hsl(199,89%,48%))' }}
          />
          <div className="grid grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <FadeIn key={i} delay={i * 0.12} className="text-center pt-0">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 relative z-10"
                  style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                >
                  {s.num}
                </div>
                <h3 className="text-white font-semibold text-sm mb-2 leading-snug">{s.title}</h3>
                <p className="text-white/45 text-xs leading-relaxed">{s.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>

        {/* Mobile vertical */}
        <div className="md:hidden max-w-lg mx-auto space-y-8">
          {steps.map((s, i) => (
            <FadeIn key={i} delay={i * 0.1} y={20}>
              <div className="flex gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                >
                  {s.num}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{s.title}</h3>
                  <p className="text-white/50 text-sm">{s.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Features ─── */
function FeaturesSection() {
  const features = [
    { icon: Route, title: 'Route-First Thinking', desc: 'We plan your entire route city by city, not just a destination name.' },
    { icon: Shield, title: 'Honest Downsides', desc: 'Every recommendation includes real warnings. No sugarcoating.' },
    { icon: BookOpen, title: 'Passport-Aware', desc: 'Visa requirements and entry rules based on YOUR passport.' },
    { icon: Search, title: 'Real-Time Research', desc: 'We search the web before every analysis. Always up to date.' },
    { icon: DollarSign, title: 'Smart Budget Matching', desc: 'Budget vs Moderate vs Luxury — matched to real destination costs.' },
    { icon: Layers, title: 'Compare & Save', desc: 'Save analyses, compare routes side by side, share with travel partners.' },
  ]

  return (
    <section className="py-24 border-t border-white/10" style={{ background: '#0d1526' }}>
      <div className="container mx-auto px-4 lg:px-8">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Not just recommendations. A full plan.</h2>
          <p className="text-white/55 text-lg">Everything a real travel consultant would tell you.</p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <FadeIn key={i} delay={i * 0.08}>
                <div
                  className="rounded-2xl p-6 h-full group hover:-translate-y-1 transition-transform duration-300"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(8px)' }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                    style={{ background: 'rgba(255,133,51,0.15)' }}
                  >
                    <Icon className="h-5 w-5" style={{ color: 'hsl(22,100%,62%)' }} />
                  </div>
                  <h3 className="text-white font-semibold text-base mb-2">{f.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── Demo / Sample Result ─── */
function DemoSection() {
  const dests = [
    {
      name: 'Slovenia', route: 'Ljubljana → Bled → Piran', score: 91,
      reasons: ['Visa-free for EU passports', 'Compact — 3 cities in 7 days'],
      color: 'hsl(22,100%,62%)',
    },
    {
      name: 'Portugal', route: 'Lisbon → Porto → Algarve', score: 87,
      reasons: ['Year-round mild weather', 'Budget-friendly in Western Europe'],
      color: 'hsl(199,89%,48%)',
    },
    {
      name: 'Georgia', route: 'Tbilisi → Kazbegi → Batumi', score: 83,
      reasons: ['Visa-free 365 days for most passports', 'Exceptional value: €50/day'],
      color: 'hsl(43,74%,66%)',
    },
  ]

  return (
    <section id="demo" className="py-24" style={{ background: '#0f1729' }}>
      <div className="container mx-auto px-4 lg:px-8">
        <FadeIn className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">See a real analysis</h2>
          <p className="text-white/55 text-lg">10-day trip from London, moderate budget, history + food</p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="relative max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              {dests.map((d, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)' }}
                >
                  <div className="h-1" style={{ background: d.color }} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-bold text-lg">{d.name}</h3>
                      <span className="text-xs text-white/35 font-semibold">#{i + 1}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/45 text-xs mb-3">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{d.route}</span>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/40">Score</span>
                        <span className="text-sm font-bold text-white">{d.score}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: d.color }} />
                      </div>
                    </div>
                    {d.reasons.map((r, j) => (
                      <div key={j} className="flex items-start gap-1.5 text-xs text-white/60 mb-1.5">
                        <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mt-4 rounded-xl px-5 py-4 flex items-start gap-3"
              style={{ background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.2)' }}
            >
              <span className="shrink-0 mt-0.5" style={{ color: 'hsl(38,92%,60%)' }}>⚠</span>
              <div className="text-sm">
                <span className="font-semibold" style={{ color: 'hsl(38,92%,60%)' }}>Before You Book: </span>
                <span className="text-white/55">
                  October in Slovenia has ~50% chance of rain. Pack waterproof layers.
                  Bled in peak season (Jul–Aug) gets very crowded — shoulder season strongly recommended.
                </span>
              </div>
            </div>

            {/* Overlay gradient + CTA */}
            <div
              className="absolute inset-0 flex items-end justify-center pb-10 rounded-2xl"
              style={{ background: 'linear-gradient(to bottom, transparent 20%, rgba(15,23,41,0.97) 75%)' }}
            >
              <div className="flex flex-col items-center gap-4">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-white/80"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
                >
                  ✓ AI Verified • Real-time data • Updated today
                </div>
                <Link href="/dashboard/analysis">
                  <Button
                    size="lg"
                    className="h-12 px-8 font-bold text-white border-0 shadow-xl hover:opacity-90 hover:scale-105 transition-all"
                    style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                  >
                    Try it yourself →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

/* ─── Pricing ─── */
function PricingSection() {
  const freeFeatures = ['3 analyses per month', 'Basic route recommendations', 'Standard destinations']
  const proFeatures = ['Unlimited analyses', 'Real-time web research (Tavily)', 'Price alerts & notifications', 'Save & compare unlimited trips', 'Priority AI processing']
  const explorerFeatures = ['Everything in Pro', 'Multi-trip workspace', 'Travel partner sharing', 'Export to PDF', 'Early access to new features']

  return (
    <section id="pricing" className="py-24 border-t border-white/10" style={{ background: '#0d1526' }}>
      <div className="container mx-auto px-4 lg:px-8">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple, honest pricing</h2>
          <p className="text-white/55 text-lg">No hidden fees. No commitment. Cancel anytime.</p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
          {/* Free */}
          <FadeIn delay={0}>
            <div
              className="rounded-2xl p-8"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            >
              <h3 className="text-white font-bold text-xl mb-1">Free</h3>
              <p className="text-white/45 text-sm mb-6">For curious travelers</p>
              <div className="text-4xl font-bold text-white mb-8">
                $0<span className="text-lg font-normal text-white/40">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {freeFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-white/65 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block">
                <Button
                  variant="outline"
                  className="w-full bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white hover:border-white/35"
                >
                  Start Free
                </Button>
              </Link>
            </div>
          </FadeIn>

          {/* Pro */}
          <FadeIn delay={0.1}>
            <div
              className="rounded-2xl p-8 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(255,133,51,0.12) 0%, rgba(15,25,50,0.98) 100%)',
                border: '1.5px solid hsl(22,100%,62%)',
                boxShadow: '0 0 35px rgba(255,133,51,0.18), 0 20px 40px rgba(0,0,0,0.4)',
              }}
            >
              <div
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold text-white rounded-full px-4 py-1 whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
              >
                MOST POPULAR
              </div>
              <h3 className="text-white font-bold text-xl mb-1">Pro</h3>
              <p className="text-white/45 text-sm mb-6">For serious travelers</p>
              <div className="text-4xl font-bold text-white mb-8">
                $9<span className="text-lg font-normal text-white/40">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {proFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-white/80 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block">
                <Button
                  className="w-full h-11 font-bold text-white border-0 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                >
                  Start Pro Trial
                </Button>
              </Link>
              <p className="text-center text-white/35 text-xs mt-2">7 days free</p>
            </div>
          </FadeIn>

          {/* Explorer */}
          <FadeIn delay={0.2}>
            <div
              className="rounded-2xl p-8"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            >
              <h3 className="text-white font-bold text-xl mb-1">Explorer</h3>
              <p className="text-white/45 text-sm mb-6">For travel power users</p>
              <div className="text-4xl font-bold text-white mb-8">
                $19<span className="text-lg font-normal text-white/40">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {explorerFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-white/65 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block">
                <Button
                  variant="outline"
                  className="w-full bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white hover:border-white/35"
                >
                  Go Explorer
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

/* ─── Testimonials ─── */
function TestimonialsSection() {
  const testimonials = [
    {
      quote: "I was about to book Bali in August — TravelScan told me it's peak monsoon. Saved me from a miserable trip. Went to Japan instead. Best decision ever.",
      name: 'Sarah K.', city: 'London', initial: 'S',
    },
    {
      quote: 'The route planning is insane. It gave me Ljubljana → Bled → Piran with exact nights per city. My travel agent never did that.',
      name: 'Marcus T.', city: 'Amsterdam', initial: 'M',
    },
    {
      quote: "I've tried every travel app. This is the first one that actually told me the truth about visa requirements for my passport.",
      name: 'Aisha M.', city: 'Dubai', initial: 'A',
    },
  ]

  return (
    <section className="py-24 border-t border-white/10" style={{ background: '#0d1526' }}>
      <div className="container mx-auto px-4 lg:px-8">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">What travelers say</h2>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div
                className="rounded-2xl p-6 h-full flex flex-col"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <div className="text-4xl text-white/15 font-serif leading-none mb-4 select-none">&ldquo;</div>
                <p className="text-white/75 text-sm leading-relaxed flex-1 mb-6">{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
                  >
                    {t.initial}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-white/35 text-xs">{t.city}</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Final CTA ─── */
function FinalCTASection() {
  return (
    <section className="py-32 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #080e1c 0%, #0f1729 50%, #080e1c 100%)' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px', opacity: 0.2,
        }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(255,133,51,0.10) 0%, transparent 70%)',
          top: '-30%', left: '50%', transform: 'translateX(-50%)',
        }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative container mx-auto px-4 text-center">
        <FadeIn>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5">
            Your next trip starts<br />with one question.
          </h2>
          <p className="text-xl text-white/55 mb-10">Where do you want to go?</p>
          <Link href="/dashboard/analysis">
            <Button
              size="lg"
              className="h-16 px-12 text-lg font-bold text-white border-0 shadow-2xl hover:opacity-90 hover:scale-105 transition-all"
              style={{ background: 'linear-gradient(135deg, hsl(22,100%,62%), hsl(38,92%,50%))' }}
            >
              Start Planning Free →
            </Button>
          </Link>
          <p className="mt-6 text-white/30 text-sm">No credit card. No spam. Cancel anytime.</p>
        </FadeIn>
      </div>
    </section>
  )
}

/* ─── Footer ─── */
function FooterSection() {
  return (
    <footer className="border-t border-white/10 py-12" style={{ background: '#080e1c' }}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-1">
              <Plane className="h-4 w-4" style={{ color: 'hsl(22,100%,62%)' }} />
              <span>TravelScan AI</span>
            </div>
            <p className="text-white/35 text-sm">AI-Powered Travel Intelligence</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-white/45 text-sm">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <span className="text-white/25">Blog (coming soon)</span>
          </nav>
          <p className="text-white/25 text-sm">Made with ❤ for curious travelers</p>
        </div>
      </div>
    </footer>
  )
}

/* ─── Root export ─── */
export default function LandingPage() {
  return (
    <div style={{ background: '#0f1729' }}>
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DemoSection />
      <PricingSection />
      <TestimonialsSection />
      <FinalCTASection />
      <FooterSection />
    </div>
  )
}
