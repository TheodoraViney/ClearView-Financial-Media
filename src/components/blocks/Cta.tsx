import type { Cta as CtaValue } from '@/sanity/types'

export function Cta({ heading, text, link }: CtaValue) {
  return (
    <section className="flex flex-col items-start gap-3 px-6 py-10">
      {heading && <h2 className="text-2xl font-semibold">{heading}</h2>}
      {text && <p>{text}</p>}
      {link?.href && (
        <a
          href={link.href}
          className="rounded px-4 py-2 text-white"
          style={{ backgroundColor: 'var(--brand-color)' }}
        >
          {link.label ?? 'Read more'}
        </a>
      )}
    </section>
  )
}
