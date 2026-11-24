import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { useMe } from '@/api/neos/endpoints/me'
import { useTasks } from '@/api/studio/endpoints/tasks'
import { logoutEverywhere } from '@/auth/oauth'
import { config } from '@/config'
import { PROFILE_SETTINGS } from '@/features/modals/builtin'
import { useModals } from '@/features/modals/ModalHost'
import {
  panelTitle,
  usePanelBadge,
  type PanelDefinition,
} from '@/features/panels/registry'
import { openShortcutOverview } from '@/features/shortcuts/ShortcutHost'
import { translate as t } from '@/lib/i18n'
import { setLayoutMode } from '@/lib/layoutMode'
import { cn } from '@/lib/utils'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardIcon,
  CommentsIcon,
  EditorModeIcon,
  HelpIcon,
  HistoryIcon,
  KeyboardIcon,
  LanguageIcon,
  LayoutIcon,
  LogoutIcon,
  MediaModeIcon,
  OutlineIcon,
  PagesIcon,
  PersonIcon,
  TasksModeIcon,
  TrashIcon,
  WorkspacesModeIcon,
} from './icons'
import {
  RailPill,
  ShellMenuItem,
  ShellMenuSeparator,
  surfacePopup,
} from './primitives'
import { Tooltip } from './Tooltip'
import { containedPortal } from '@/lib/portalContainer'

const MenuPortalContained = containedPortal(MenuPrimitive.Portal)

/** A mode of the rail: a main-region panel shown in place of the preview. */
export interface RailMode {
  panel: string
  label: string
  icon: React.ReactNode
}

const MODE_ICONS: Record<string, React.ReactNode> = {
  'visual-editor': <EditorModeIcon />,
  'media-library': <MediaModeIcon />,
  workspaces: <WorkspacesModeIcon />,
  tasks: <TasksModeIcon />,
}

const PANEL_ICONS: Record<string, React.ReactNode> = {
  'shellAlpha:pages': <PagesIcon />,
  outline: <OutlineIcon />,
  clipboard: <ClipboardIcon />,
  trash: <TrashIcon />,
  history: <HistoryIcon />,
  inspector: <EditorModeIcon />,
  'Beromir.NeosStudio.Comments:comments': <CommentsIcon />,
}

/** The built-in labels of the modes, shorter than the panel titles. */
export function modeLabel(definition: PanelDefinition): string {
  switch (definition.id) {
    case 'visual-editor':
      return t('shellAlpha.mode.editor', 'Editor')
    case 'media-library':
      return t('shellAlpha.mode.media', 'Media')
    default:
      return panelTitle(definition)
  }
}

/** Open, the switcher always lists the modes in this order, plugin modes last. */
const MODE_ORDER = ['visual-editor', 'media-library', 'workspaces', 'tasks']

function orderedModes(modes: PanelDefinition[]): PanelDefinition[] {
  const rank = (definition: PanelDefinition) => {
    const index = MODE_ORDER.indexOf(definition.id)
    return index === -1 ? MODE_ORDER.length : index
  }
  return [...modes].sort((a, b) => rank(a) - rank(b))
}

export function modeIcon(panel: string): React.ReactNode {
  return MODE_ICONS[panel] ?? <PluginGlyph />
}

function PluginGlyph() {
  return <i className="fas fa-puzzle-piece type-icon-s" aria-hidden />
}

const railButton =
  'relative inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-shell-muted outline-none transition-colors hover:bg-shell-hover hover:text-shell-text focus-visible:ring-2 focus-visible:ring-shell-accent/60 data-[active=true]:bg-shell-active data-[active=true]:text-shell-text data-popup-open:bg-shell-active data-popup-open:text-shell-text [--knob:var(--color-shell-surface)] hover:[--knob:var(--color-shell-hover)] data-[active=true]:[--knob:var(--color-shell-active)]'

export function Rail({
  modes,
  mode,
  onModeChange,
  panels,
  open,
  onTogglePanel,
}: {
  modes: PanelDefinition[]
  mode: string
  onModeChange: (panel: string) => void
  /** The panels of the current mode, in rail order; null entries divide. */
  panels: (PanelDefinition | null)[]
  /** The left column's open panel. */
  open: string | null
  onTogglePanel: (panel: string) => void
}) {
  const [modesOpen, setModesOpen] = React.useState(false)
  const openTasks = useOpenTaskCount()
  const current = modes.find((definition) => definition.id === mode)

  return (
    <nav
      aria-label={t('shellAlpha.rail', 'Modes and panels')}
      className="flex w-11 shrink-0 flex-col gap-2"
    >
      <RailPill>
        {!modesOpen ? (
          <div className="flex w-9 flex-col items-center gap-px">
            <Tooltip side="right" label={current && modeLabel(current)}>
              <button
                type="button"
                data-active
                className={railButton}
                onClick={() => setModesOpen(true)}
                aria-label={t('shellAlpha.switchMode', 'Switch mode')}
                aria-expanded={false}
              >
                {modeIcon(mode)}
                {openTasks > 0 && (
                  <span className="absolute top-1 right-1 size-1.75 rounded-full border-[1.5px] border-shell-active bg-shell-accent" />
                )}
              </button>
            </Tooltip>
            <button
              type="button"
              className="flex h-3 w-9 cursor-pointer items-center justify-center text-shell-subtle hover:text-shell-text"
              onClick={() => setModesOpen(true)}
              tabIndex={-1}
              aria-hidden
            >
              <ChevronDownIcon strokeWidth={1.3} />
            </button>
          </div>
        ) : (
          <>
            {orderedModes(modes).map((definition) => {
              const active = definition.id === mode
              return (
                <Tooltip
                  key={definition.id}
                  side="right"
                  label={modeLabel(definition)}
                >
                  <button
                    type="button"
                    data-active={active}
                    className={railButton}
                    aria-label={modeLabel(definition)}
                    aria-pressed={active}
                    onClick={() => {
                      onModeChange(definition.id)
                      setModesOpen(false)
                    }}
                  >
                    {modeIcon(definition.id)}
                    {definition.id === 'tasks' && openTasks > 0 && (
                      <span className="absolute top-2 right-2 size-1.75 rounded-full border-[1.5px] border-(--knob) bg-shell-accent" />
                    )}
                  </button>
                </Tooltip>
              )
            })}
            <button
              type="button"
              className="flex h-3 w-9 cursor-pointer items-center justify-center text-shell-subtle hover:text-shell-text"
              onClick={() => setModesOpen(false)}
              aria-label={t('shellAlpha.collapseModes', 'Collapse modes')}
            >
              <ChevronUpIcon />
            </button>
          </>
        )}
      </RailPill>

      {panels.length > 0 && (
        <RailPill>
          {panels.map((definition, index) =>
            definition === null ? (
              <div
                key={`divider-${index}`}
                className="flex h-2.25 w-9 items-center justify-center"
              >
                <div className="h-px w-4.5 bg-shell-divider" />
              </div>
            ) : (
              <PanelButton
                key={definition.id}
                definition={definition}
                active={open === definition.id}
                onClick={() => onTogglePanel(definition.id)}
              />
            ),
          )}
        </RailPill>
      )}

      <div className="flex-1" />

      <RailPill className="self-auto">
        <AccountMenu />
      </RailPill>
    </nav>
  )
}

function PanelButton({
  definition,
  active,
  onClick,
}: {
  definition: PanelDefinition
  active: boolean
  onClick: () => void
}) {
  const badge = usePanelBadge(definition)
  const title = panelTitle(definition)
  return (
    <Tooltip
      side="right"
      label={badge?.label ? `${title} · ${badge.label}` : title}
    >
      <button
        type="button"
        data-active={active}
        className={railButton}
        aria-label={title}
        aria-pressed={active}
        onClick={onClick}
      >
        {PANEL_ICONS[definition.id] ?? <PluginGlyph />}
        {badge && (
          <span
            className={cn(
              'absolute top-2 right-2 size-1.75 rounded-full',
              badge.tone === 'neutral'
                ? 'bg-shell-muted'
                : badge.tone === 'warning'
                  ? 'bg-shell-conflict'
                  : 'bg-destructive',
            )}
          />
        )}
      </button>
    </Tooltip>
  )
}

function useOpenTaskCount(): number {
  const { data: tasks } = useTasks()
  return tasks?.filter((task) => task.status === 'OPEN').length ?? 0
}

function AccountMenu() {
  const { data: me } = useMe()
  const { openSettings } = useModals()
  const name = me?.user?.label ?? me?.account.identifier ?? ''
  const role = me?.account.roles
    .map((identifier) => identifier.split(':').pop() ?? identifier)
    .join(', ')
  const language =
    config.availableLanguages
      .find(({ value }) => value === config.interfaceLanguage)
      ?.label.split(' – ')[0] ?? config.interfaceLanguage

  return (
    <MenuPrimitive.Root>
      <Tooltip side="right" label={name}>
        <MenuPrimitive.Trigger
          className={railButton + ' text-shell-text'}
          aria-label={t('userMenu.label', 'User menu')}
        >
          <PersonIcon />
        </MenuPrimitive.Trigger>
      </Tooltip>
      <MenuPortalContained>
        <MenuPrimitive.Positioner
          side="right"
          align="end"
          sideOffset={16}
          alignOffset={-4}
          className="z-200 outline-none"
        >
          <MenuPrimitive.Popup className={cn(surfacePopup, 'w-62 p-1')}>
            <div className="flex flex-col gap-0.5 p-2.5">
              <span className="truncate text-[0.8125rem] leading-4.5 font-semibold text-shell-text">
                {name}
              </span>
              <span className="truncate type-shell-secondary text-shell-subtle">
                {me?.account.identifier}
                {role ? ` · ${role}` : ''}
              </span>
            </div>
            <ShellMenuSeparator />
            <ShellMenuItem
              icon={<PersonIcon width={12} height={12} />}
              onClick={() => openSettings(PROFILE_SETTINGS)}
            >
              {t('shellAlpha.account.profile', 'Profile & password')}
            </ShellMenuItem>
            <ShellMenuItem
              icon={<LanguageIcon />}
              trailing={language}
              onClick={() => openSettings(PROFILE_SETTINGS)}
            >
              {t('shellAlpha.account.language', 'Interface language')}
            </ShellMenuItem>
            <ShellMenuItem
              icon={<KeyboardIcon />}
              onClick={openShortcutOverview}
            >
              {t('shortcuts.overview.title', 'Keyboard shortcuts')}
            </ShellMenuItem>
            <ShellMenuItem
              icon={<HelpIcon />}
              onClick={() =>
                window.open('https://docs.neos.io', '_blank', 'noopener')
              }
            >
              {t('shellAlpha.account.help', 'Help & documentation')}
            </ShellMenuItem>
            <ShellMenuItem
              icon={<LayoutIcon />}
              onClick={() => void setLayoutMode('classic')}
            >
              {t(
                'shellAlpha.account.classicLayout',
                'Back to the classic layout',
              )}
            </ShellMenuItem>
            <ShellMenuSeparator />
            <ShellMenuItem
              icon={<LogoutIcon />}
              onClick={() => void logoutEverywhere()}
            >
              {t('shellAlpha.account.logout', 'Log out')}
            </ShellMenuItem>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPortalContained>
    </MenuPrimitive.Root>
  )
}
