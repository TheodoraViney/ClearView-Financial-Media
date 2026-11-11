import { notFound } from 'next/navigation'
import { type ReactNode } from 'react'

import { BRANDS, isBrandKey } from '@/brands'
import { AdSlot } from '@/components/ui/AdSlot'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { ArticleCard } from '@/components/ui/ArticleCard'
import { ArticleRow } from '@/components/ui/ArticleRow'
import { Avatar } from '@/components/ui/Avatar'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { CheckboxGroup } from '@/components/ui/CheckboxGroup'
import { Container } from '@/components/ui/Container'
import { DefinitionList } from '@/components/ui/DefinitionList'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterChip } from '@/components/ui/FilterChip'
import { EmailField } from '@/components/ui/EmailField'
import { Figure } from '@/components/ui/Figure'
import { FormField } from '@/components/ui/FormField'
import { Heading } from '@/components/ui/Heading'
import { Icon, iconMap, type IconName } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { ListLink } from '@/components/ui/ListLink'
import { Media } from '@/components/ui/Media'
import { Meta } from '@/components/ui/Meta'
import { Pagination } from '@/components/ui/Pagination'
import { PromoRow } from '@/components/ui/PromoRow'
import { PullQuote } from '@/components/ui/PullQuote'
import { SearchResultCard } from '@/components/ui/SearchResultCard'
import { Select } from '@/components/ui/Select'

import { ActionButtonDemo } from './ActionButtonDemo.client'
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

const ICONS = Object.keys(iconMap) as IconName[]

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
          <Row label="subtle, size compact (44, 40 from 1200; article Share and Copy link)">
            <Button variant="subtle" size="compact">
              <Icon name="share" />
              Share
            </Button>
            <Button variant="subtle" size="compact">
              <Icon name="link" />
              Copy link
            </Button>
          </Row>
          <Row label="ActionButton (client, onClick; same variants and sizes)">
            <ActionButtonDemo />
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

        <Group title="Form field kit, size sm (subscribe pop-up)">
          <div className="grid max-w-130 gap-6">
            <div className="grid gap-6 header:grid-cols-2 header:gap-x-4">
              <FormField label="First name" required>
                {(control) => <Input {...control} size="sm" />}
              </FormField>
              <FormField label="Last name" required error="Enter your last name.">
                {(control) => <Input {...control} size="sm" />}
              </FormField>
            </div>
            <FormField label="Email address" required>
              {(control) => <Input {...control} size="sm" type="email" placeholder="name@company.com" />}
            </FormField>
            <div className="grid gap-6 header:grid-cols-2 header:gap-x-4">
              <FormField label="Country" marker="Optional">
                {(control) => (
                  <Select
                    {...control}
                    defaultValue=""
                    placeholder="Select country"
                    options={[
                      { key: 'gb', label: 'United Kingdom' },
                      { key: 'ch', label: 'Switzerland' },
                    ]}
                  />
                )}
              </FormField>
              <FormField label="Industry type" marker="Optional">
                {(control) => (
                  <Select
                    {...control}
                    defaultValue="fo"
                    placeholder="Select industry type"
                    options={[
                      { key: 'fo', label: 'Family Office' },
                      { key: 'other', label: 'Other' },
                    ]}
                  />
                )}
              </FormField>
            </div>
            <CheckboxGroup legend="Interests">
              <Checkbox size="sm" label="WealthBriefing Daily News" locked marker="Required" />
              <Checkbox size="sm" label="Awards" />
              <Checkbox size="sm" label="Research" defaultChecked />
            </CheckboxGroup>
            <CheckboxGroup legend="Group error" error="Choose at least one newsletter.">
              <Checkbox size="sm" label="WealthBriefing" />
            </CheckboxGroup>
            <Checkbox size="sm" aria-invalid label="I agree to receive email updates and accept the Privacy Policy, a consent text long enough to wrap." />
          </div>
        </Group>

        <Group title="Media (no images in repo yet, light placeholder)">
          {/* `sizes` per box: 192 wide; narrower ratios crop the sides, height × 16/9 (144 → 256, 128 → 228). */}
          <Row label="ratios">
            <Media ratio="16/9" sizes="192px" className="w-48" />
            <Media ratio="4/3" sizes="256px" className="w-48" />
            <Media ratio="3/2" sizes="228px" className="w-48" />
          </Row>
          <Row label="thumbs: xs 36, sm 40, md 64/80, report 28×40">
            {/* Thumb height × 16/9: 36 → 64, 40 → 72, 80 → 144. */}
            <Media thumb="xs" sizes="64px" />
            <Media thumb="sm" sizes="72px" />
            <Media thumb="md" sizes="144px" />
            <Media thumb="report" sizes="72px" />
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
            {/* 256 wide, 192 high at 4:3: 192 × 16/9 ≈ 341 → 344px. */}
            <Media sizes="344px" className="aspect-4/3 w-64 md:aspect-video">
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
              sizes="(min-width: 64rem) 500px, (min-width: 48rem) 67vw, 134vw"
              meta={['WealthBriefing', '2 hours ago']}
            />
            <ArticleCard
              href="#"
              tall
              title="Global Economy, Earnings Confound The Doubters Amid Global Storms"
              sizes="(min-width: 64rem) 720px, (min-width: 48rem) 67vw, 134vw"
              meta={['WealthBriefingAsia', '4 hours ago']}
            />
          </div>
        </Group>

        <Group title="ArticleCard variant stacked (article Recommended: 3:2, meta above the title, accent hover)">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 header:grid-cols-3">
            <ArticleCard
              variant="stacked"
              href="#"
              title="Growing Demand For Private Markets Amongst Wealthy – Barclays Private Bank"
              sizes="(min-width: 75rem) 300px, (min-width: 48rem) 50vw, 100vw"
              meta={['Private Markets', '1 Oct 2026']}
            />
            <ArticleCard
              variant="stacked"
              href="#"
              title="Global IPO Proceeds Hit Record, Listing Numbers Drop – EY"
              sizes="(min-width: 75rem) 300px, (min-width: 48rem) 50vw, 100vw"
              meta={['Capital Markets', '30 Sep 2026']}
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
          <Row label="accent (article Most read, row padding from the parent)">
            <ListLink
              href="#"
              variant="accent"
              title="UK Taxpayers Telling HMRC Of Departure Rise Almost 33 Per Cent"
              meta={['Tax', '30 Sep 2026']}
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

        <Group title="FilterChip (link; 44 below header, 36 from it; selected: accent, tick, aria-current)">
          <Row label="content type">
            <FilterChip href="?chip=all" label="All" count={29} selected />
            <FilterChip href="?chip=article" label="Articles" count={20} />
            <FilterChip href="?chip=award" label="Awards" count={4} />
            <FilterChip href="?chip=event" label="Events" count={1} />
            <FilterChip href="?chip=none" label="No count" />
          </Row>
        </Group>

        <Group title="SearchResultCard (8 / 3 of 12 columns from md, 1fr 112px on mobile; slot always reserved)">
          <ol className="max-w-237 border-t border-border">
            <li>
              <SearchResultCard
                href="#"
                typeLabel="Article"
                date="12 October 2026"
                meta={['Strategy', 'United Kingdom']}
                title="Expanding Footprint Marks Significant Year For Barclays' International Private Bank"
                summary="The international private bank discusses its strategy and recent expansion, including a new Singapore booking centre, and why it expects growth to continue across Asia and the Middle East next year."
                image={{ src: 'https://cdn.sanity.io/images/hcxqlh4h/production/167912c956d9ae5113719006fadf680ab259247f-1900x993.jpg' }}
              />
            </li>
            <li>
              <SearchResultCard
                href="#"
                typeLabel="Research"
                date="15 October 2024"
                meta={['WM Market Reports']}
                title="WealthBriefing’s Tech And Ops Trends In Wealth Management Research Report"
                summary="The twelfth edition of WealthBriefing’s annual technology and operations trends report."
                image={{ src: 'https://cdn.sanity.io/images/hcxqlh4h/production/e25b292bdf557ce72c0713eaecb69daba0b3ee35-700x1400.jpg' }}
                imageFit="contain"
              />
            </li>
            <li>
              <SearchResultCard
                href="#"
                typeLabel="Award"
                date="18 November 2026"
                meta={['Dubai']}
                title="The Thirteenth WealthBriefing MENA Awards for Excellence 2026"
                summary={null}
                image={null}
              />
            </li>
          </ol>
        </Group>

        <Group title="Pagination (touch: 44 below header, 36 from it; fixed: 36, Categories)">
          <Row label="size=touch strongCurrent">
            <Pagination
              className="max-w-237"
              size="touch"
              strongCurrent
              label="Search results pages"
              pages={[1, 2, 3, 4, 5, null, 12].map((page) => (page ? { page, href: `?page=${page}`, current: page === 2 } : null))}
              previousHref="?page=1"
              nextHref="?page=3"
              previousLabel="Previous"
              nextLabel="Next"
            />
          </Row>
          <Row label="size=fixed (Categories)">
            <Pagination
              className="max-w-237"
              pages={[1, null, 48, 49, 50, null, 99].map((page) => (page ? { page, href: `?page=${page}`, current: page === 49 } : null))}
              previousHref="?page=48"
              nextHref="?page=50"
              previousLabel="Previous"
              nextLabel="Next"
            />
          </Row>
        </Group>

        <Group title="EmptyState (brand tint panel, magnifier scan, action slot)">
          <EmptyState
            className="max-w-237"
            title="No results found"
            text="Sorry, we couldn’t find any results for ‘wealth managment’. Try a different search term or check your spelling."
            action={
              <Button variant="outline-accent" size="compact" href="#" className="px-5">
                Start New Search
              </Button>
            }
          />
        </Group>

        <Group title="Breadcrumb">
          <Breadcrumb items={[{ label: 'Home', href: '#' }, { label: 'News', href: '#' }, { label: 'Strategy' }]} />
        </Group>

        <Group title="Avatar (40px: photo, else initials on the brand tint; text sm 13 or lg 20)">
          <Row label="initials">
            <Avatar name="Tom Burroughes" />
            <Avatar name="Tom Burroughes" text="lg" />
          </Row>
        </Group>

        <Group title="Figure (caption 13 grey under the content)">
          <Figure caption="Image: WealthBriefing" className="max-w-182">
            <Media sizes="728px" className="h-55 w-full md:h-75" />
          </Figure>
        </Group>

        <Group title="PullQuote">
          <PullQuote
            className="max-w-182"
            quote="The Nordic region has a sophisticated ecosystem of wealth creation shaped by innovation and entrepreneurship."
            cite="BNP Paribas Wealth Management"
          />
        </Group>

        <Group title="DefinitionList (stacked on mobile, 140px label column from md)">
          <DefinitionList
            className="max-w-182"
            items={[
              { key: 'audience', label: 'Audience', value: 'Ultra-high-net-worth individuals, entrepreneurs and family offices' },
              { key: 'market', label: 'Market', value: 'Nordic wealth management' },
            ]}
          />
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
