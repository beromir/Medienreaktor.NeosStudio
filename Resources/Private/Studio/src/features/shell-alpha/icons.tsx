import type { SVGProps } from 'react'

/*
 * The alpha layout's icons, as drawn in the Paper file. currentColor where
 * the design colours them by state; the button around them sets it.
 */

type IconProps = Omit<
  SVGProps<SVGSVGElement>,
  'width' | 'height' | 'viewBox'
> & { width?: number; height?: number }

function Svg({
  width,
  height,
  viewBox,
  children,
  ...props
}: IconProps & { width: number; height: number; viewBox: string }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      aria-hidden
      className="shrink-0"
      {...props}
    >
      {children}
    </svg>
  )
}

export const GlobeIcon = (props: IconProps) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" {...props}>
    <circle cx="6" cy="6" r="5" fill="currentColor" stroke="none" />
    <path
      d="M1 6h10M6 1c-2 2.5-2 7.5 0 10M6 1c2 2.5 2 7.5 0 10"
      stroke="var(--color-shell-surface)"
    />
  </Svg>
)

export const PageIcon = (props: IconProps) => (
  <Svg width={10} height={12} viewBox="0 0 10 12" stroke="none" {...props}>
    <path
      d="M0 1a1 1 0 011-1h5l4 4v7a1 1 0 01-1 1H1a1 1 0 01-1-1z"
      fill="currentColor"
    />
  </Svg>
)

export const ChevronDownIcon = (props: IconProps) => (
  <Svg width={8} height={5} viewBox="0 0 8 5" strokeWidth={1.4} {...props}>
    <path d="M1 1l3 3 3-3" />
  </Svg>
)

export const ChevronUpIcon = (props: IconProps) => (
  <Svg width={8} height={5} viewBox="0 0 8 5" strokeWidth={1.3} {...props}>
    <path d="M1 4l3-3 3 3" />
  </Svg>
)

export const BackIcon = (props: IconProps) => (
  <Svg width={6} height={10} viewBox="0 0 6 10" strokeWidth={1.5} {...props}>
    <path d="M5 1L1 5l4 4" />
  </Svg>
)

export const LinkIcon = (props: IconProps) => (
  <Svg
    width={14}
    height={14}
    viewBox="0 0 16 16"
    strokeWidth={1.6}
    strokeLinecap="round"
    {...props}
  >
    <path d="M6.5 9.5l3-3M7 4.5l1.2-1.2a2.8 2.8 0 014 4L11 8.5M9 11.5l-1.2 1.2a2.8 2.8 0 01-4-4L5 7.5" />
  </Svg>
)

export const ExternalIcon = (props: IconProps) => (
  <Svg
    width={12}
    height={12}
    viewBox="0 0 16 16"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5 11L11 5M6 5h5v5" />
  </Svg>
)

export const ArrowRightIcon = (props: IconProps) => (
  <Svg width={10} height={8} viewBox="0 0 10 9" strokeWidth={1.4} {...props}>
    <path d="M0 4.5h8.5M5 1l3.5 3.5L5 8" />
  </Svg>
)

export const WarningIcon = (props: IconProps) => (
  <Svg width={12} height={11} viewBox="0 0 12 11" strokeWidth={1.4} {...props}>
    <path d="M6 1l5 9H1z" strokeLinejoin="round" />
    <path d="M6 4.5v2.2M6 8.2v.1" strokeLinecap="round" />
  </Svg>
)

export const DesktopIcon = (props: IconProps) => (
  <Svg width={14} height={12} viewBox="0 0 14 12" strokeWidth={1.4} {...props}>
    <rect x=".7" y=".7" width="12.6" height="8" rx="1" />
    <path d="M4.5 11.3h5" />
  </Svg>
)

export const TabletIcon = (props: IconProps) => (
  <Svg width={10} height={13} viewBox="0 0 10 13" strokeWidth={1.4} {...props}>
    <rect x=".7" y=".7" width="8.6" height="11.6" rx="1.5" />
  </Svg>
)

export const PhoneIcon = (props: IconProps) => (
  <Svg width={8} height={12} viewBox="0 0 8 12" strokeWidth={1.4} {...props}>
    <rect x=".7" y=".7" width="6.6" height="10.6" rx="1.5" />
  </Svg>
)

export const EditorModeIcon = (props: IconProps) => (
  <Svg width={14} height={14} viewBox="0 0 14 14" strokeWidth={1.5} {...props}>
    <rect x=".8" y=".8" width="12.4" height="12.4" rx="2.5" />
    <path d="M.8 4.6h12.4M5 4.6v8.6" />
  </Svg>
)

export const MediaModeIcon = (props: IconProps) => (
  <Svg width={14} height={13} viewBox="0 0 14 13" strokeWidth={1.3} {...props}>
    <rect x=".8" y=".8" width="12.4" height="11.4" rx="2" strokeWidth={1.4} />
    <circle cx="4.5" cy="4.5" r="1.3" fill="currentColor" stroke="none" />
    <path d="M1.5 11l3.5-3.5 2.5 2.2 2-1.7 3.3 3" />
  </Svg>
)

export const WorkspacesModeIcon = (props: IconProps) => (
  <Svg
    width={14}
    height={14}
    viewBox="0 0 14 14"
    strokeWidth={1.3}
    strokeLinejoin="round"
    {...props}
  >
    <path d="M7 1l6 3-6 3-6-3z" />
    <path d="M1 7l6 3 6-3M1 10l6 3 6-3" />
  </Svg>
)

export const TasksModeIcon = (props: IconProps) => (
  <Svg width={13} height={13} viewBox="0 0 13 13" strokeWidth={1.4} {...props}>
    <rect x=".7" y=".7" width="11.6" height="11.6" rx="2.5" />
    <path d="M3.8 6.6l1.8 1.8 3.6-3.8" />
  </Svg>
)

export const OutlineIcon = (props: IconProps) => (
  <Svg
    width={14}
    height={12}
    viewBox="0 0 14 12"
    strokeWidth={1.5}
    strokeLinecap="round"
    {...props}
  >
    <path d="M1 1.5h12M3.5 6H13M6 10.5h7" />
  </Svg>
)

export const ClipboardIcon = (props: IconProps) => (
  <Svg width={12} height={14} viewBox="0 0 12 14" strokeWidth={1.4} {...props}>
    <rect x=".8" y="2" width="10.4" height="11.2" rx="2" />
    <path d="M4 1h4" strokeWidth={2} strokeLinecap="round" />
  </Svg>
)

export const TrashIcon = (props: IconProps) => (
  <Svg
    width={12}
    height={14}
    viewBox="0 0 12 14"
    strokeWidth={1.4}
    strokeLinejoin="round"
    {...props}
  >
    <path d="M1 3.2h10M4.2 3V1.6h3.6V3M2.3 3.2l.7 9.6h6l.7-9.6" />
  </Svg>
)

export const CommentsIcon = (props: IconProps) => (
  <Svg width={14} height={13} viewBox="0 0 13 12" strokeWidth={1.3} {...props}>
    <path d="M6.5 .7C9.7.7 12.3 2.6 12.3 5s-2.6 4.3-5.8 4.3c-.7 0-1.4-.1-2-.3L1.4 10.6l.9-2.3C1.3 7.5.7 6.3.7 5 .7 2.6 3.3.7 6.5.7z" />
  </Svg>
)

export const HistoryIcon = (props: IconProps) => (
  <Svg width={13} height={13} viewBox="0 0 13 13" strokeWidth={1.4} {...props}>
    <circle cx="6.5" cy="6.5" r="5.5" />
    <path d="M6.5 3.5v3l2 1.5" strokeLinecap="round" />
  </Svg>
)

export const PersonIcon = (props: IconProps) => (
  <Svg width={14} height={14} viewBox="0 0 14 14" strokeWidth={1.4} {...props}>
    <circle cx="7" cy="4.5" r="2.8" />
    <path
      d="M1.8 13c.6-2.8 2.7-4.3 5.2-4.3s4.6 1.5 5.2 4.3"
      strokeLinecap="round"
    />
  </Svg>
)

export const PlusIcon = (props: IconProps) => (
  <Svg
    width={13}
    height={13}
    viewBox="0 0 14 14"
    strokeWidth={2.2}
    strokeLinecap="round"
    {...props}
  >
    <path d="M7 1v12M1 7h12" />
  </Svg>
)

export const SearchIcon = (props: IconProps) => (
  <Svg width={14} height={14} viewBox="0 0 12 12" strokeWidth={1.4} {...props}>
    <circle cx="5" cy="5" r="4" />
    <path d="M8 8l3 3" strokeLinecap="round" />
  </Svg>
)

export const UndoIcon = (props: IconProps) => (
  <Svg width={13} height={13} viewBox="0 0 14 14" strokeWidth={1.6} {...props}>
    <path d="M2.5 4.5A5.5 5.5 0 111.5 8" />
    <path d="M1 1.5v4h4" />
  </Svg>
)

export const RedoIcon = (props: IconProps) => (
  <Svg width={13} height={13} viewBox="0 0 14 14" strokeWidth={1.6} {...props}>
    <path d="M11.5 4.5A5.5 5.5 0 1012.5 8" />
    <path d="M13 1.5v4H9" />
  </Svg>
)

/** The fill of the knobs takes the button's background (--knob). */
export const SettingsIcon = (props: IconProps) => (
  <Svg width={13} height={13} viewBox="0 0 12 12" strokeWidth={1.4} {...props}>
    <path d="M1 3h10M1 9h10" />
    <circle
      cx="4"
      cy="3"
      r="1.8"
      fill="var(--knob, var(--color-shell-surface))"
    />
    <circle
      cx="8"
      cy="9"
      r="1.8"
      fill="var(--knob, var(--color-shell-surface))"
    />
  </Svg>
)

export const CopyIcon = (props: IconProps) => (
  <Svg width={13} height={13} viewBox="0 0 12 12" strokeWidth={1.3} {...props}>
    <rect x="3.7" y="3.7" width="7.6" height="7.6" rx="1.5" />
    <path d="M8.3 2V1.8A1.1 1.1 0 007.2.7H1.8A1.1 1.1 0 00.7 1.8v5.4a1.1 1.1 0 001.1 1.1H2" />
  </Svg>
)

export const MoreIcon = (props: IconProps) => (
  <Svg width={14} height={4} viewBox="0 0 14 4" stroke="none" {...props}>
    <circle cx="2" cy="2" r="1.5" fill="currentColor" />
    <circle cx="7" cy="2" r="1.5" fill="currentColor" />
    <circle cx="12" cy="2" r="1.5" fill="currentColor" />
  </Svg>
)

export const CloseIcon = (props: IconProps) => (
  <Svg width={10} height={10} viewBox="0 0 10 10" strokeWidth={1.5} {...props}>
    <path d="M1 1l8 8M9 1L1 9" />
  </Svg>
)

export const CheckIcon = (props: IconProps) => (
  <Svg width={10} height={8} viewBox="0 0 13 10" strokeWidth={1.8} {...props}>
    <path d="M1 5l3.5 3.5L12 1" />
  </Svg>
)

export const DoubleChevronIcon = (props: IconProps) => (
  <Svg width={10} height={9} viewBox="0 0 10 9" strokeWidth={1.4} {...props}>
    <path d="M5.5 1L9 4.5 5.5 8M1 1l3.5 3.5L1 8" />
  </Svg>
)

export const FolderIcon = (props: IconProps) => (
  <Svg width={12} height={10} viewBox="0 0 14 12" strokeWidth={1.3} {...props}>
    <path d="M1 2h4l1.5 1.5H13v7.5H1z" />
  </Svg>
)

export const UploadIcon = (props: IconProps) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" strokeWidth={1.5} {...props}>
    <path d="M6 8V1M3 4l3-3 3 3M1 8v3h10V8" />
  </Svg>
)

export const LanguageIcon = (props: IconProps) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" strokeWidth={1.3} {...props}>
    <circle cx="6" cy="6" r="5" />
    <path
      d="M1 6h10M6 1c-2 2.5-2 7.5 0 10M6 1c2 2.5 2 7.5 0 10"
      strokeWidth={1.1}
    />
  </Svg>
)

export const KeyboardIcon = (props: IconProps) => (
  <Svg width={14} height={10} viewBox="0 0 14 10" strokeWidth={1.3} {...props}>
    <rect x=".7" y=".7" width="12.6" height="8.6" rx="1.5" />
    <path d="M3.5 6.5h7M3.5 3.5h1M6.5 3.5h1M9.5 3.5h1" strokeWidth={1.2} />
  </Svg>
)

export const HelpIcon = (props: IconProps) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" strokeWidth={1.3} {...props}>
    <circle cx="6" cy="6" r="5" />
    <path d="M4.6 4.6a1.5 1.5 0 112 1.4c-.4.2-.6.5-.6.9v.3" strokeWidth={1.2} />
    <circle cx="6" cy="8.8" r=".7" fill="currentColor" stroke="none" />
  </Svg>
)

export const LogoutIcon = (props: IconProps) => (
  <Svg width={12} height={12} viewBox="0 0 12 12" strokeWidth={1.3} {...props}>
    <path d="M7.5 1.5H2.5a1 1 0 00-1 1v7a1 1 0 001 1h5M5 6h6M9 4l2 2-2 2" />
  </Svg>
)

export const LayoutIcon = (props: IconProps) => (
  <Svg width={14} height={12} viewBox="0 0 14 12" strokeWidth={1.3} {...props}>
    <rect x=".7" y=".7" width="12.6" height="10.6" rx="2" />
    <path d="M4.5 .7v10.6" />
  </Svg>
)

export const PinIcon = ({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) => (
  <Svg width={14} height={14} viewBox="0 0 14 14" {...props}>
    <path
      d="M8.6 1.4l4 4-1.6.8-2.3 2.3.3 2.6-1 1L2 6.1l1-1 2.6.3 2.3-2.3z"
      fill={filled ? 'currentColor' : 'none'}
      strokeWidth={1.2}
      strokeLinejoin="round"
    />
    <path d="M4.6 9.4L1.4 12.6" strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
)

export const ChangeTypeIcon = (props: IconProps) => (
  <Svg
    width={14}
    height={13}
    viewBox="0 0 14 13"
    strokeWidth={1.3}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M1 4h10.5M8.5 1l3 3-3 3M13 9H2.5M5.5 6l-3 3 3 3" />
  </Svg>
)

export const EyeIcon = (props: IconProps) => (
  <Svg width={15} height={12} viewBox="0 0 15 12" strokeWidth={1.3} {...props}>
    <path
      d="M1.2 6S3.6 1.8 7.5 1.8 13.8 6 13.8 6 11.4 10.2 7.5 10.2 1.2 6 1.2 6z"
      strokeLinejoin="round"
    />
    <circle cx="7.5" cy="6" r="2" />
  </Svg>
)

export const EyeOffIcon = (props: IconProps) => (
  <Svg width={15} height={12} viewBox="0 0 15 12" strokeWidth={1.3} {...props}>
    <path
      d="M1.2 6S3.6 1.8 7.5 1.8 13.8 6 13.8 6 11.4 10.2 7.5 10.2 1.2 6 1.2 6z"
      strokeLinejoin="round"
    />
    <circle cx="7.5" cy="6" r="2" />
    <path d="M2 11L13 1" strokeLinecap="round" />
  </Svg>
)

export const CalendarIcon = (props: IconProps) => (
  <Svg width={13} height={13} viewBox="0 0 13 13" strokeWidth={1.3} {...props}>
    <rect x=".8" y="2" width="11.4" height="10.2" rx="1.8" />
    <path d="M.8 5.2h11.4M4 .6v2.6M9 .6v2.6" strokeLinecap="round" />
  </Svg>
)

/** The tree rows' chevron: right when closed, down when open. */
export const TreeChevronIcon = ({
  open = false,
  ...props
}: IconProps & { open?: boolean }) => (
  <Svg
    width={10}
    height={10}
    viewBox="0 0 10 10"
    strokeWidth={1.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d={open ? 'M2 3.5l3 3 3-3' : 'M3.5 2l3 3-3 3'} />
  </Svg>
)

export const UpArrowIcon = (props: IconProps) => (
  <Svg
    width={10}
    height={10}
    viewBox="0 0 10 10"
    strokeWidth={1.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5 9V1.5M1.5 5L5 1.5 8.5 5" />
  </Svg>
)
