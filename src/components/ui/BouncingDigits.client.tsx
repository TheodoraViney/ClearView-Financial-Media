'use client'

import { useEffect, useRef } from 'react'

const frame = (y: number, sx: number, sy: number) => `translateY(${y}px) scale(${sx},${sy})`

/**
 * The not-found page's digits (wb-g-404): each hops on its own random timer, with squash and stretch, and when all
 * are still another one is kicked off. Still with reduced motion, and it stops or starts when that setting changes.
 */
export function BouncingDigits({ text }: { text: string }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    const digits = refs.current
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timers: number[] = []
    let anims: Animation[] = []
    let kickTimer = 0
    let moving = 0
    let dead = false

    const kick = (last: number) => {
      window.clearTimeout(kickTimer)
      kickTimer = window.setTimeout(() => {
        if (dead || query.matches || moving > 0) return
        const pool = digits.map((_, n) => n).filter((n) => n !== last)
        const n = pool[Math.floor(Math.random() * pool.length)]
        window.clearTimeout(timers[n])
        bounce(n)
      }, 120 + Math.random() * 180)
    }

    const bounce = (i: number) => {
      const el = digits[i]
      if (!el || dead || query.matches) return
      const fs = parseFloat(getComputedStyle(el).fontSize) || 240
      const h = Math.min(50, fs * 0.2) * (0.85 + Math.random() * 0.15)
      const s = Math.min(1, fs / 240)
      const anim = el.animate(
        [
          { offset: 0, transform: frame(0, 1, 1), easing: 'ease-in-out' },
          { offset: 0.14, transform: frame(4 * s, 1.035, 0.965), easing: 'cubic-bezier(.2,.7,.3,1)' },
          { offset: 0.24, transform: frame(-h * 0.25, 0.975, 1.03), easing: 'cubic-bezier(.15,.6,.35,1)' },
          { offset: 0.44, transform: frame(-h, 1, 1), easing: 'linear' },
          { offset: 0.54, transform: frame(-h * 0.97, 1, 1), easing: 'cubic-bezier(.55,0,.9,.4)' },
          { offset: 0.7, transform: frame(0, 0.985, 1.02), easing: 'ease-out' },
          { offset: 0.78, transform: frame(0, 1.04, 0.96), easing: 'ease-out' },
          { offset: 0.89, transform: frame(-3 * s, 0.995, 1.005), easing: 'ease-in-out' },
          { offset: 1, transform: frame(0, 1, 1) },
        ],
        { duration: 1050 + Math.random() * 250 },
      )
      anims[i] = anim
      moving += 1
      window.clearTimeout(kickTimer)
      anim.onfinish = () => {
        moving = Math.max(0, moving - 1)
        timers[i] = window.setTimeout(() => bounce(i), 600 + Math.random() * 1600)
        if (moving === 0) kick(i)
      }
    }

    const stop = () => {
      window.clearTimeout(kickTimer)
      moving = 0
      timers.forEach((t) => window.clearTimeout(t))
      anims.forEach((a) => a?.cancel())
      timers = []
      anims = []
    }

    const start = () => {
      stop()
      if (query.matches) return
      digits.forEach((_, i) => {
        timers[i] = window.setTimeout(() => bounce(i), 400 + [0, 380, 820][i % 3] + Math.random() * 300)
      })
    }

    const onChange = () => (query.matches ? stop() : start())

    query.addEventListener('change', onChange)
    start()

    return () => {
      dead = true
      stop()
      query.removeEventListener('change', onChange)
    }
  }, [text])

  return (
    <p aria-hidden="true" className="flex justify-center text-error-code font-medium tracking-error-code tabular-nums text-outline">
      {[...text].map((char, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className="inline-block origin-bottom will-change-transform"
        >
          {char}
        </span>
      ))}
    </p>
  )
}
