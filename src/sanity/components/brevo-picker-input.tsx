import { RefreshIcon } from '@sanity/icons/Refresh'
import { SearchIcon } from '@sanity/icons/Search'
import { Box, Button, Card, Flex, Stack, Text, TextInput } from '@sanity/ui'
import { Autocomplete } from '@sanity/ui/autocomplete'
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { type FormPatch, type ObjectInputProps, set, setIfMissing, unset, useClient } from 'sanity'

import { apiVersion } from '@/sanity/env'

/**
 * Searchable picker for the brevoList, brevoSegment, brevoTemplate, brevoSender and brevoAttribute fields
 * (src/sanity/schema/objects/brevo.ts).
 *
 * Options come from GET /api/brevo/{resource} with the signed-in user's Sanity token, like the newsletter actions.
 * Each resource is loaded once per page session and shared by every picker on the page; Refresh reloads it for all of
 * them, so an item created in Brevo shows up without reloading Studio, and a failed load can be retried.
 * Selecting patches the sub-fields one by one rather than replacing the object, so the picker also works inside array
 * items; the copied name keeps the value readable when the item is gone from Brevo.
 *
 * Every resource but attributes is keyed on its numeric id; attributes have no id, so they are keyed on the name.
 */

type Resource = 'lists' | 'segments' | 'templates' | 'senders' | 'attributes'

/** One option as /api/brevo/{resource} returns it. Only the fields of its own resource are present. */
type Item = { id?: number; name: string; subscribers?: number; subject?: string; email?: string; category?: string }

type StoredValue = { id?: number; name?: string; email?: string }

type LoadState =
  | { status: 'idle' }
  // A refresh keeps the options already loaded on screen until the new ones arrive.
  | { status: 'loading'; items?: Item[] }
  | { status: 'ready'; items: Item[] }
  | { status: 'error'; error: string }

const GENERIC_ERROR = 'Could not load the options from Brevo.'

// ---------------------------------------------------------------------------------------------------------------
// Options per resource, module-level so every picker on the page shares one request.

const IDLE: LoadState = { status: 'idle' }

const states = new Map<Resource, LoadState>()
const listeners = new Map<Resource, Set<() => void>>()

function setState(resource: Resource, state: LoadState) {
  states.set(resource, state)
  listeners.get(resource)?.forEach((listener) => listener())
}

function useLoadState(resource: Resource): LoadState {
  const subscribe = useCallback(
    (listener: () => void) => {
      const forResource = listeners.get(resource) ?? new Set()

      forResource.add(listener)
      listeners.set(resource, forResource)

      return () => {
        forResource.delete(listener)
      }
    },
    [resource],
  )

  return useSyncExternalStore(
    subscribe,
    () => states.get(resource) ?? IDLE,
    () => IDLE,
  )
}

/** Loads the resource unless it is loading, or already loaded and `refresh` is not set. */
async function load(resource: Resource, token: string, refresh = false) {
  const current = states.get(resource) ?? IDLE

  if (current.status === 'loading' || (current.status === 'ready' && !refresh)) {
    return
  }

  setState(resource, { status: 'loading', items: current.status === 'ready' ? current.items : undefined })

  try {
    const response = await fetch(`/api/brevo/${resource}`, { headers: { authorization: `Bearer ${token}` } })
    const body = (await response.json().catch(() => null)) as Partial<{
      ok: boolean
      items: Item[]
      error: string
    }> | null

    setState(
      resource,
      response.ok && body?.ok && Array.isArray(body.items)
        ? { status: 'ready', items: body.items }
        : { status: 'error', error: body?.error || GENERIC_ERROR },
    )
  } catch {
    setState(resource, { status: 'error', error: 'Could not reach the server.' })
  }
}

// ---------------------------------------------------------------------------------------------------------------
// What differs per resource.

const subscriberCount = (count: number) =>
  `${count.toLocaleString('en-GB')} ${count === 1 ? 'subscriber' : 'subscribers'}`

type ResourceConfig = {
  noun: string
  /** The option's value and the stored value's match key: the id, or the name for attributes. */
  keyOf: (value: StoredValue | Item) => string | undefined
  /** What an option row and the input show. Built from the stored copy when the item is not loaded. */
  label: (value: StoredValue | Item) => string
  /** A second, grey line under an option. */
  detail?: (item: Item) => string | undefined
  /** The sub-fields written on select, besides `_type`. Only what the field type declares. */
  fields: (item: Item) => Record<string, string | number>
  /** Text the search matches, besides the label. */
  searchText: (item: Item) => string[]
  /** Why a stored value is not among the options, after "is no longer in Brevo". */
  missingNote?: string
}

const byId: Pick<ResourceConfig, 'keyOf'> = {
  keyOf: (value) => (typeof value.id === 'number' ? String(value.id) : undefined),
}

const nameAndId = (value: StoredValue | Item) => `${value.name || 'Unnamed'} · #${value.id}`

const RESOURCES: Record<Resource, ResourceConfig> = {
  lists: {
    ...byId,
    noun: 'list',
    // A list's subscriber count would go stale, so it is shown but not stored.
    label: (value) =>
      'subscribers' in value && typeof value.subscribers === 'number'
        ? `${nameAndId(value)} · ${subscriberCount(value.subscribers)}`
        : nameAndId(value),
    fields: (item) => ({ id: item.id!, name: item.name }),
    searchText: (item) => [item.name, String(item.id)],
  },
  segments: {
    ...byId,
    noun: 'segment',
    label: nameAndId,
    detail: (item) => item.category || undefined,
    fields: (item) => ({ id: item.id!, name: item.name }),
    searchText: (item) => [item.name, String(item.id), item.category ?? ''],
  },
  templates: {
    ...byId,
    noun: 'template',
    label: nameAndId,
    detail: (item) => item.subject || undefined,
    fields: (item) => ({ id: item.id!, name: item.name }),
    searchText: (item) => [item.name, String(item.id)],
    missingNote: ' as an active opt-in template',
  },
  senders: {
    ...byId,
    noun: 'sender',
    label: (value) => `${value.name || 'Unnamed'} <${value.email ?? ''}>`,
    fields: (item) => ({ id: item.id!, name: item.name, email: item.email ?? '' }),
    searchText: (item) => [item.name, String(item.id), item.email ?? ''],
  },
  attributes: {
    noun: 'attribute',
    keyOf: (value) => value.name || undefined,
    label: (value) => value.name || 'Unnamed',
    fields: (item) => ({ name: item.name }),
    searchText: (item) => [item.name],
    missingNote: ' as a yes/no attribute',
  },
}

/** Case-insensitive match on the resource's search text; a leading # is ignored, for ids. */
function matches(config: ResourceConfig, query: string, item: Item): boolean {
  const needle = query.trim().toLowerCase().replace(/^#/, '')

  return !needle || config.searchText(item).some((field) => field.toLowerCase().includes(needle))
}

// ---------------------------------------------------------------------------------------------------------------

type Option = { value: string; item: Item }

function BrevoPickerInput({ resource, props }: { resource: Resource; props: ObjectInputProps }) {
  const { id, onChange, readOnly, schemaType } = props
  const value = props.value as StoredValue | undefined
  const config = RESOURCES[resource]
  const { noun } = config
  // In token login mode the workspace client carries the user's token (see `auth` in sanity.config.ts).
  const token = useClient({ apiVersion }).config().token
  const state = useLoadState(resource)

  useEffect(() => {
    if (token && state.status === 'idle') {
      void load(resource, token)
    }
  }, [resource, token, state.status])

  const reload = useCallback(() => {
    if (token) {
      void load(resource, token, true)
    }
  }, [resource, token])

  const loading = state.status === 'loading'
  const items = useMemo(() => ('items' in state ? (state.items ?? []) : []), [state])
  const options = useMemo<Option[]>(
    () => items.flatMap((item) => (config.keyOf(item) ? [{ value: config.keyOf(item)!, item }] : [])),
    [config, items],
  )
  const storedKey = value ? config.keyOf(value) : undefined
  const missing = storedKey !== undefined && state.status === 'ready' && !options.some((o) => o.value === storedKey)

  const select = useCallback(
    (selected: string) => {
      const option = options.find((candidate) => candidate.value === selected)

      if (!option) {
        return
      }

      const patches: FormPatch[] = [setIfMissing({ _type: schemaType.name })]

      for (const [field, fieldValue] of Object.entries(config.fields(option.item))) {
        patches.push(set(fieldValue, [field]))
      }

      onChange(patches)
    },
    [config, onChange, options, schemaType.name],
  )

  // The Autocomplete's own clear button (keyboard reachable, labelled "Clear") is the one way to clear: it empties
  // the query and calls onChange(''), which unsets the field. Selecting calls onChange with the new key instead.
  const change = useCallback(
    (next: string) => {
      if (next === '') {
        onChange(unset())
      }
    },
    [onChange],
  )

  if (!token) {
    return (
      <Card padding={3} radius={2} tone="caution" border>
        <Text size={1}>Sign out and sign in again to load Brevo {noun}s.</Text>
      </Card>
    )
  }

  const storedLabel = value && storedKey !== undefined ? config.label(value) : ''

  return (
    <Stack gap={2}>
      {readOnly ? (
        <TextInput id={id} readOnly value={storedLabel} placeholder={`No ${noun} chosen`} />
      ) : (
        <Flex gap={2} align="center">
          <Box flex={1}>
            <Autocomplete<Option>
              id={id}
              icon={SearchIcon}
              options={options}
              value={storedKey ?? ''}
              loading={loading}
              openButton
              placeholder={loading ? `Loading Brevo ${noun}s…` : `Search ${noun}s`}
              filterOption={(query, option) => matches(config, query, option.item)}
              renderOption={(option) => {
                const detail = config.detail?.(option.item)

                return (
                  <Card as="button" padding={3}>
                    <Stack gap={2}>
                      <Text size={1}>{config.label(option.item)}</Text>
                      {detail ? (
                        <Text size={1} muted>
                          {detail}
                        </Text>
                      ) : null}
                    </Stack>
                  </Card>
                )
              }}
              renderValue={(selected, option) => (option ? config.label(option.item) : storedLabel || selected)}
              onSelect={select}
              onChange={change}
            />
          </Box>
          <Button
            icon={RefreshIcon}
            mode="bleed"
            title={`Reload ${noun}s from Brevo`}
            aria-label={`Reload ${noun}s from Brevo`}
            disabled={loading}
            onClick={reload}
          />
        </Flex>
      )}

      {missing ? (
        <Card padding={3} radius={2} tone="caution" border role="status" aria-live="polite">
          <Text size={1}>
            {storedLabel} is no longer in Brevo{config.missingNote ?? ''}. Choose another {noun}.
          </Text>
        </Card>
      ) : null}

      {state.status === 'error' ? (
        <Card padding={3} radius={2} tone="critical" border role="alert">
          <Flex gap={3} align="center">
            <Box flex={1}>
              <Text size={1}>{state.error}</Text>
            </Box>
            <Button text="Retry" mode="ghost" fontSize={1} padding={2} onClick={reload} />
          </Flex>
        </Card>
      ) : null}
    </Stack>
  )
}

export const BrevoListInput = (props: ObjectInputProps) => <BrevoPickerInput resource="lists" props={props} />

export const BrevoSegmentInput = (props: ObjectInputProps) => <BrevoPickerInput resource="segments" props={props} />

export const BrevoTemplateInput = (props: ObjectInputProps) => <BrevoPickerInput resource="templates" props={props} />

export const BrevoSenderInput = (props: ObjectInputProps) => <BrevoPickerInput resource="senders" props={props} />

export const BrevoAttributeInput = (props: ObjectInputProps) => <BrevoPickerInput resource="attributes" props={props} />
