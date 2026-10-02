export function Cta({
  heading,
  text,
  href,
  label,
}: {
  heading?: string
  text?: string
  href?: string
  label?: string
}) {
  return (
    <section className="flex flex-col items-start gap-3 px-6 py-10">
      {heading && <h2 className="text-2xl font-semibold">{heading}</h2>}
      {text && <p>{text}</p>}
      {href && (
        <a
          href={href}
          className="rounded px-4 py-2 text-white"
          style={{ backgroundColor: 'var(--brand-color)' }}
        >
          {label ?? 'Read more'}
        </a>
      )}
    </section>
  )
}
