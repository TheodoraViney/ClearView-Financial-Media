import { notFound } from 'next/navigation'
import { type ReactNode } from 'react'

import { BRANDS, isBrandKey } from '@/brands'
import { AdSlot } from '@/components/ui/AdSlot'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { ArticleCard } from '@/components/ui/ArticleCard'
import { ArticleRow } from '@/components/ui/ArticleRow'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Container } from '@/components/ui/Container'
import { EmailField } from '@/components/ui/EmailField'
import { Heading } from '@/components/ui/Heading'
import { Icon, type IconName } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { ListLink } from '@/components/ui/ListLink'
import { Media } from '@/components/ui/Media'
import { Meta } from '@/components/ui/Meta'
import { PromoRow } from '@/components/ui/PromoRow'
import { SliderDots } from '@/components/ui/SliderDots'

// Temporary design-system review page. Open it on each brand host to compare brand tokens.

const SHARED_COLORS = [
  { name: 'foreground', className: 'bg-foreground' },
  { name: 'dark', className: 'bg-dark' },
  { name: 'grey', className: 'bg-grey' },
  { name: 'border', className: 'bg-border' },
  { name: 'border-plus', className: 'bg-border-plus' },
  { name: 'light', className: 'bg-light' },
  { name: 'dark-blue-grey', className: 'bg-dark-blue-grey' },
  { name: 'light-blue-grey', className: 'bg-light-blue-grey' },
  { name: 'white', className: 'bg-white' },
]

const BRAND_COLORS = [
  { name: 'accent', className: 'bg-accent' },
  { name: 'accent-hover', className: 'bg-accent-hover' },
  { name: 'accent-subtle', className: 'bg-accent-subtle' },
  { name: 'secondary', className: 'bg-secondary' },
  { name: 'focus', className: 'bg-focus' },
  { name: 'surface-hover', className: 'bg-surface-hover' },
  { name: 'input', className: 'bg-input' },
  { name: 'error', className: 'bg-error' },
  { name: 'ad-surface', className: 'bg-ad-surface' },
  { name: 'ad-border', className: 'bg-ad-border' },
  { name: 'ad-foreground', className: 'bg-ad-foreground' },
]

const TYPE_ROLES = [
  { name: 'text-display', size: '36 / 40 / 48', className: 'text-display' },
  { name: 'text-heading-lg', size: '28 / 36 / 36', className: 'text-heading-lg font-medium' },
  { name: 'text-heading-md', size: '24 / 32 / 32', className: 'text-heading-md font-medium' },
  { name: 'text-heading-sm', size: '22 / 26 / 26', className: 'text-heading-sm font-medium' },
  { name: 'text-title-lg', size: '20', className: 'text-title-lg font-medium' },
  { name: 'text-title-md', size: '16', className: 'text-title-md font-medium' },
  { name: 'text-base', size: '16', className: 'text-base' },
  { name: 'text-sm', size: '14', className: 'text-sm' },
  { name: 'text-caption', size: '13', className: 'text-caption text-grey' },
]

const SPACING = [
  { name: 'gutter', value: '16 / 32 / 64 (from 1280)', className: 'w-gutter' },
  { name: 'section', value: '48 / 64 / 80', className: 'w-section' },
  { name: 'section-lg', value: '56 / 72 / 120', className: 'w-section-lg' },
]

const ICONS: IconName[] = [
  'chevron-right',
  'chevron-down',
  'search',
  'close',
  'menu',
  'menu-close',
  'download',
  'check',
]

export default async function UiPage({
  params,
}: {
  params: Promise<{ brand: string }>
}) {
  const { brand } = await params

  if (!isBrandKey(brand) || process.env.NEXT_PUBLIC_SITE_ENV === 'production') {
    notFound()
  }

  return (
    <main className="py-section">
      <Container className="flex flex-col gap-16">
        <header className="flex flex-col gap-2">
          <h1 className="text-heading-lg font-medium">UI kit</h1>
          <p className="text-base text-grey">
            Brand: {BRANDS[brand].title}. Open on another brand host to see its
            colours.
          </p>
        </header>

        <Group title="Colours: shared">
          <Swatches colors={SHARED_COLORS} />
        </Group>

        <Group title="Colours: brand">
          <Swatches colors={BRAND_COLORS} />
        </Group>

        <Group title="Typography (mobile / tablet / desktop, px)">
          <div className="flex flex-col divide-y divide-border">
            {TYPE_ROLES.map((role) => (
              <div
                key={role.name}
                className="flex flex-col gap-2 py-4 md:flex-row md:items-baseline md:gap-8"
              >
                <code className="w-48 shrink-0 text-caption text-grey">
                  {role.name} · {role.size}
                </code>
                <span className={role.className}>
                  Connecting the global wealth management community
                </span>
              </div>
            ))}
          </div>
        </Group>

        <Group title="Spacing tokens">
          <div className="flex flex-col gap-3">
            {SPACING.map((item) => (
              <div key={item.name} className="flex items-center gap-4">
                <code className="w-48 shrink-0 text-caption text-grey">
                  {item.name} · {item.value}
                </code>
                <span className={`h-4 rounded-sm bg-accent ${item.className}`} />
              </div>
            ))}
            <div className="flex items-center gap-4">
              <code className="w-48 shrink-0 text-caption text-grey">
                radius · rounded-sm 4px
              </code>
              <span className="size-12 rounded-sm bg-dark-blue-grey" />
            </div>
          </div>
        </Group>

        <Group title="Icons">
          <div className="flex flex-wrap gap-6 text-foreground">
            {ICONS.map((name) => (
              <div key={name} className="flex flex-col items-center gap-2">
                <span className="flex size-11 items-center justify-center rounded-sm border border-border">
                  <Icon name={name} />
                </span>
                <code className="text-caption text-grey">{name}</code>
              </div>
            ))}
          </div>
        </Group>

        <Group title="Button">
          <Row label="primary">
            <Button>Sign Up</Button>
            <Button size="lg">Sign Up (lg, 48px)</Button>
            <Button arrow>With arrow</Button>
          </Row>
          <Row label="outline">
            <Button variant="outline" href="#" arrow>
              View all research
            </Button>
            <Button variant="outline" href="#" arrow fullWidth>
              View all summits &amp; events (full width)
            </Button>
          </Row>
          <Row label="outline-inverse" dark>
            <Button variant="outline-inverse" href="#" arrow>
              View all awards
            </Button>
          </Row>
        </Group>

        <Group title="ArrowLink">
          <Row label="accent">
            <ArrowLink href="#" variant="accent">
              Read article
            </ArrowLink>
            <ArrowLink href="#" variant="accent">
              View all stories
            </ArrowLink>
          </Row>
          <Row label="default">
            <ArrowLink href="#">Visit WealthBriefing</ArrowLink>
          </Row>
        </Group>

        <Group title="IconButton">
          <Row label="surface (md 44px)">
            <IconButton icon="menu" label="Open menu" />
            <IconButton icon="menu-close" label="Close menu" pressed />
          </Row>
          <Row label="fade (sm, 32px on desktop)">
            <IconButton icon="search" label="Open search" size="sm" variant="fade" />
            <IconButton icon="close" label="Close search" size="sm" variant="fade" />
          </Row>
        </Group>

        <Group title="Meta">
          <Row label="default">
            <Meta items={['Family Wealth Report', '16 September 2026']} />
            <Meta items={['15–16 May 2025', 'London']} />
          </Row>
          <Row label="inverse" dark>
            <Meta items={['Entry deadline: 30 Apr 2025']} variant="inverse" />
            <Meta items={['WealthBriefing', '2 hours ago']} variant="inverse" />
          </Row>
        </Group>

        <Group title="Input">
          <div className="grid max-w-xl gap-4">
            <Input placeholder="Enter your email address" aria-label="Default" />
            <Input
              placeholder="Invalid"
              aria-label="Invalid"
              aria-invalid
              defaultValue="not-an-email"
            />
            <div className="flex h-11 items-center rounded-sm inset-ring inset-ring-border">
              <span className="flex size-11 items-center justify-center">
                <Icon name="search" />
              </span>
              <Input
                variant="bare"
                type="search"
                aria-label="Search"
                placeholder="Search news, research and events (bare)"
                className="flex-1"
              />
            </div>
          </div>
        </Group>

        <Group title="EmailField (stacked on mobile, inline from md)">
          <div className="grid max-w-xl gap-6">
            <EmailField />
            <EmailField status="error" message="Please enter a valid email address." />
            <EmailField status="success" message="Thank you. You’re subscribed." />
          </div>
        </Group>

        <Group title="Checkbox">
          <div className="grid max-w-xl gap-x-6 md:grid-cols-2 md:gap-y-4 lg:grid-cols-1">
            <Checkbox label="WealthBriefing" />
            <Checkbox label="WealthBriefingAsia" defaultChecked />
            <Checkbox label="Family Wealth Report" defaultChecked />
            <Checkbox label="Awards" />
          </div>
        </Group>

        <Group title="Media (no images in repo yet, light placeholder)">
          <Row label="ratios">
            <Media alt="16/9" ratio="16/9" className="w-48" />
            <Media alt="4/3" ratio="4/3" className="w-48" />
            <Media alt="3/2" ratio="3/2" className="w-48" />
          </Row>
          <Row label="thumbs: xs 36, sm 40, md 64/80, report 28×40">
            <Media alt="xs" thumb="xs" />
            <Media alt="sm" thumb="sm" />
            <Media alt="md" thumb="md" />
            <Media alt="report" thumb="report" />
          </Row>
        </Group>

        <Group title="SliderDots (toggle buttons with aria-pressed, in a labelled group)">
          <Row label="on an image" dark>
            <SliderDots
              label="Top stories"
              labels={['Show story 1 of 3', 'Show story 2 of 3', 'Show story 3 of 3']}
              selected={0}
            />
          </Row>
          <Row label="Media children overlay, responsive aspect via className">
            <Media alt="overlay" className="aspect-4/3 w-64 md:aspect-video">
              <div className="flex h-full items-end justify-end p-3">
                <SliderDots
                  label="Top stories"
                  labels={['Show story 1 of 3', 'Show story 2 of 3', 'Show story 3 of 3']}
                  selected={1}
                />
              </div>
            </Media>
          </Row>
        </Group>

        <Group title="AdSlot">
          <div className="flex flex-col gap-4">
            <AdSlot size="leaderboard" label="Banner Position 1 – Leaderboard (728x90)" />
            <AdSlot size="billboard" label="Banner Position 2 – Mid Page (970x90)" />
          </div>
        </Group>

        <Group title="ArticleCard">
          <div className="grid gap-8 md:grid-cols-2 md:gap-6 lg:grid-cols-4 lg:gap-8">
            <ArticleCard
              href="#"
              title="India's Spark Capital PWM Adds Eight-Person Team Of Bankers"
              meta={['WealthBriefing', '2 hours ago']}
            />
            <ArticleCard
              href="#"
              tall
              title="Global Economy, Earnings Confound The Doubters Amid Global Storms"
              meta={['WealthBriefingAsia', '4 hours ago']}
            />
          </div>
        </Group>

        <Group title="ArticleRow (divided below lg, bordered card from lg)">
          <div className="flex flex-col border-t border-border lg:grid lg:grid-cols-3 lg:gap-8 lg:border-t-0">
            <ArticleRow
              href="#"
              title="Entries Open For Sixth WealthBriefing WealthTech Americas Awards 2027"
              meta={['WealthBriefing', '30 Jul']}
            />
            <ArticleRow
              href="#"
              title="HSBC Private Bank Launches Singapore HSBC Access"
              meta={['WealthBriefingAsia', '07 Sep']}
            />
          </div>
        </Group>

        <Group title="Heading">
          <Row label="as h2, styled as text-heading-lg (the tag comes from the CMS, the class sets the look)">
            <Heading as="h2" className="text-heading-lg font-medium text-pretty">
              Connecting the global wealth management community
            </Heading>
          </Row>
        </Group>

        <Group title="ListLink">
          <Row label="default">
            <ListLink
              href="#"
              title="WealthBriefing Asia Greater China Forum"
              meta={['10 June 2025', 'Hong Kong']}
            />
          </Row>
          <Row label="inverse" dark>
            <ListLink
              href="#"
              variant="inverse"
              title="Global Wealth Awards 2025"
              meta={['Entry deadline: 30 Apr 2025']}
            />
          </Row>
        </Group>

        <Group title="PromoRow">
          <div className="flex max-w-md flex-col">
            <PromoRow
              href="#"
              title="Post-Event Report"
              description="Key insights, expert perspectives and highlights from the latest forum."
            />
            <PromoRow
              href="#"
              report
              downloadHref="#"
              title="Global Family Office Report 2025"
              description="Insights shaping family offices."
            />
            <div className="bg-light-blue-grey">
              <PromoRow
                href="#"
                variant="inverse"
                title="Latest Winner Interview"
                description="Hear how this year’s winner sets new standards."
              />
            </div>
          </div>
        </Group>
      </Container>
    </main>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6 border-t border-border pt-8">
      <h2 className="text-heading-sm font-medium">{title}</h2>
      {children}
    </section>
  )
}

function Row({
  label,
  dark = false,
  children,
}: {
  label: string
  dark?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <code className="text-caption text-grey">{label}</code>
      <div
        className={
          dark
            ? 'flex flex-wrap items-center gap-6 rounded-sm bg-light-blue-grey p-6'
            : 'flex flex-wrap items-center gap-6'
        }
      >
        {children}
      </div>
    </div>
  )
}

function Swatches({ colors }: { colors: { name: string; className: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
      {colors.map((color) => (
        <div key={color.name} className="flex flex-col gap-2">
          <span
            className={`h-16 rounded-sm inset-ring inset-ring-border ${color.className}`}
          />
          <code className="text-caption text-grey">{color.name}</code>
        </div>
      ))}
    </div>
  )
}
