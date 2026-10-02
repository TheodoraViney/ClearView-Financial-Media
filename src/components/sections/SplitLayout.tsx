import { type ReactNode } from 'react'

/**
 * Main column with a sidebar beside it from xl (1280px). Below xl the sidebar
 * stacks after the main column. The columns carry no gutter: each section
 * inside brings its own.
 */
export function SplitLayout({ main, aside }: { main: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-page xl:flex">
      <div className="min-w-0 flex-1">{main}</div>
      {aside && (
        <aside className="flex flex-col border-t border-border xl:w-86 xl:shrink-0 xl:border-t-0 xl:border-l">
          {/* Fills the sidebar's height on xl, so the last block can stretch to the bottom of the main column. */}
          <div className="flex flex-1 flex-col">{aside}</div>
        </aside>
      )}
    </div>
  )
}
