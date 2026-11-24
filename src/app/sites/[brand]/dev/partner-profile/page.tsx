import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PartnerProfilePage } from '@/components/sections/partner-profile/PartnerProfilePage'
import type { PartnerHeroPanel, PartnerProfileView } from '@/lib/partner-profile'
import { fetchAdUnits } from '@/sanity/brand-title'
import { toImage } from '@/sanity/image'

// Temporary review page, like /dev/ui (404 when NEXT_PUBLIC_SITE_ENV=production): the company profile page with the
// design's sample record (Claude Design wb-g-partner-profile v1.0), before the labels document and the WIZE profile
// fields exist in the dataset. `?record=essential` shows the design's essential-only record; `?panel=logo|lockup`
// switches the header panel fallback; `?breadcrumb=linked` links the breadcrumb's middle item, grey text without it. The design's hero image (wize-cover-1.jpg) is not available as a file, so the
// image panel shows a stand-in from the dataset. Delete together with /dev/ui.

const LOGO = toImage({ asset: { _ref: 'image-08cfd576da4a199810a1caa889dd53ca89250354-1900x1344-png' }, alt: 'WIZE logo' })
const STAND_IN = toImage({
  asset: { _ref: 'image-0214f03879db13bcfeaa645d2b86c5e9d73cb235-1900x1069-jpg' },
  alt: 'WIZE logo above a snow-capped mountain peak against a clear blue sky',
})

const block = (text: string) => ({
  _type: 'block',
  _key: text.slice(0, 8),
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: 's', text, marks: [] }],
})

const heading = (text: string, as: 'h2' | 'h3' = 'h2') => ({ as, text })

const ARCHIVE = 'https://wealthbriefing.com/archive'

const COMPLETE: Omit<PartnerProfileView, 'panel'> = {
  name: 'WIZE by TeamWork',
  breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Industry Engagement', muted: true }, { label: 'WIZE by TeamWork' }],
  typeLabel: 'Company profile',
  description: [block('WIZE is the all-in-one Wealth & Asset management IT platform.')],
  website: { label: 'Visit WIZE website', href: 'http://www.wize.net/' },
  metrics: {
    label: 'At a glance',
    items: [
      ['120', 'clients in 26 countries'],
      ['3,000+', 'users representing 120+ B CHF AuM'],
      ['250+', 'custodian connectors'],
      ['30+', 'trading rooms'],
      ['50+', 'employees in 4 offices'],
    ].map(([value, text]) => ({ key: value, value, text, note: null })),
  },
  fields: {
    heading: heading('Clients and platform'),
    rows: [
      {
        key: 'clients',
        label: 'Client types',
        values: [
          'Wealth managers / External Asset Managers',
          'Asset managers / Funds',
          'Family offices',
          'Pension funds',
          'Securities firms / Broker-dealers',
          'Private banks',
        ],
      },
      {
        key: 'platform',
        label: 'Platform areas',
        values: [
          'Asset management and reporting',
          'Custody and private banking',
          'Portfolio management',
          'Compliance and regulatory workflows',
          'Client reporting',
          'Trading and order management',
          'Data feeds and API connectivity',
        ],
      },
    ],
  },
  activity: {
    heading: heading('WealthBriefing activity and recognition'),
    sponsor: {
      heading: heading('Sponsor activity', 'h3'),
      items: [
        { key: 's1', text: 'Named as a sponsor of WealthBriefing Swiss EAM Awards 2023.' },
        { key: 's2', text: 'Named as a sponsor of WealthBriefing European Awards 2023.' },
      ],
    },
    recognition: {
      heading: heading('Recognition', 'h3'),
      items: [
        {
          key: 'r1',
          title: 'WealthBriefing Swiss External Asset Management Awards',
          year: '2021',
          winsLabel: 'WealthBriefing Swiss External Asset Management Awards 2021',
          wins: [
            'Overall IT Solution Provider',
            'Client Reporting',
            'Client Communications',
            'CRM Product or Solution',
            'Portfolio Management Solution',
          ].map((label) => ({ key: label, label })),
        },
        {
          key: 'r2',
          title: 'WealthBriefing Swiss Awards',
          year: '2021',
          winsLabel: 'WealthBriefing Swiss Awards 2021',
          wins: [{ key: 'c', label: 'Client Reporting Solution' }],
        },
      ],
    },
  },
  coverage: {
    heading: heading('Sponsor and editorial coverage'),
    interviews: {
      heading: heading('Sponsor interviews', 'h3'),
      items: [
        {
          key: 'i1',
          label: 'European Awards 2023: Sponsor Interview With Pierre Dupont From WIZE by TeamWork',
          href: `${ARCHIVE}/197730/european-awards-2023-sponsor-interview-with-pierre-dupont-from-wize-by-teamwork`,
        },
        {
          key: 'i2',
          label: 'Swiss EAM Awards 2023: Sponsor Interview With Pierre Dupont - WIZE by TeamWork',
          href: `${ARCHIVE}/197590/swiss-eam-awards-2023-sponsor-interview-with-pierre-dupont-wize-by-teamwork`,
        },
      ],
    },
    archive: {
      heading: heading('Awards archive coverage', 'h3'),
      titles: [
        "Wize By Teamwork's Central Application Supports Growth",
        'Portfolio Skills To Fore At Wize By Teamwork',
        "WIZE By Teamwork Raises External Asset Managers' Game",
        'Client Communications, Compliance Solutions Skills From WIZE',
        'Wize By Teamwork Wins EAM Platform, Offering',
      ],
      link: { label: 'WealthBriefing Awards archive', href: ARCHIVE },
    },
  },
  officialLinks: {
    heading: heading('Official links'),
    items: [
      { key: 'o1', label: 'Explore WIZE customer success stories', href: 'https://www.wize.net/en/customers-success-stories' },
      { key: 'o2', label: 'Contact WIZE', href: 'https://www.wize.net/en/contact' },
    ],
  },
  ads: { top: null, side: null },
}

function panelOf(kind: string | undefined): PartnerHeroPanel {
  if (kind === 'lockup' || !LOGO || !STAND_IN) {
    return { kind: 'lockup', name: COMPLETE.name, label: `${COMPLETE.name} logo` }
  }

  return kind === 'logo' ? { kind: 'logo', image: LOGO } : { kind: 'image', image: STAND_IN }
}

export default async function PartnerProfileReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (process.env.NEXT_PUBLIC_SITE_ENV === 'production') {
    notFound()
  }

  return (
    <Suspense fallback={null}>
      <Fixture searchParams={searchParams} />
    </Suspense>
  )
}

async function Fixture({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams
  // The real ClearView ad units, so the banners show as on the live page.
  const units = await fetchAdUnits('clearview', 'other', { perspective: 'published', stega: false })
  const panel = panelOf(typeof query.panel === 'string' ? query.panel : undefined)
  const ads = { top: units.top, side: units.side }
  // A stand-in target: the Industry Engagement catalog page is not built yet.
  const breadcrumb =
    query.breadcrumb === 'linked'
      ? COMPLETE.breadcrumb.map((item, index) => (index === 1 ? { label: item.label, href: '/' } : item))
      : COMPLETE.breadcrumb
  const view: PartnerProfileView =
    query.record === 'essential'
      ? {
          ...COMPLETE,
          breadcrumb,
          panel,
          ads,
          website: null,
          metrics: null,
          fields: null,
          activity: null,
          coverage: null,
          officialLinks: null,
        }
      : { ...COMPLETE, breadcrumb, panel, ads }

  return <PartnerProfilePage view={view} />
}
