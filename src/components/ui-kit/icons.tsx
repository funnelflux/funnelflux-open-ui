/**
 * App-wide Lucide icons — use `<Icon name="..." />` from `@/components/ui-kit`, not `lucide-react`.
 */
import { forwardRef, memo } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import {
  AlertTriangle as LucideAlertTriangle,
  Archive as LucideArchive,
  ArchiveRestore as LucideArchiveRestore,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  BarChart3 as LucideBarChart3,
  Braces as LucideBraces,
  Check as LucideCheck,
  ChevronDown as LucideChevronDown,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  ChevronUp as LucideChevronUp,
  ChevronsUpDown as LucideChevronsUpDown,
  Code as LucideCode,
  Columns3 as LucideColumns3,
  Copy as LucideCopy,
  Download as LucideDownload,
  ExternalLink as LucideExternalLink,
  FileCode as LucideFileCode,
  FileText as LucideFileText,
  Filter as LucideFilter,
  FolderInput as LucideFolderInput,
  Gift as LucideGift,
  GitBranch as LucideGitBranch,
  Globe as LucideGlobe,
  Globe2 as LucideGlobe2,
  History as LucideHistory,
  Inbox as LucideInbox,
  Layers as LucideLayers,
  LayoutGrid as LucideLayoutGrid,
  Link as LucideLink,
  Link2 as LucideLink2,
  ListTree as LucideListTree,
  Loader2 as LucideLoader2,
  LogOut as LucideLogOut,
  Mail as LucideMail,
  MailOpen as LucideMailOpen,
  Moon as LucideMoon,
  Network as LucideNetwork,
  Pencil as LucidePencil,
  Play as LucidePlay,
  Plus as LucidePlus,
  RefreshCw as LucideRefreshCw,
  RotateCcw as LucideRotateCcw,
  Save as LucideSave,
  Search as LucideSearch,
  Send as LucideSend,
  Settings as LucideSettings,
  Settings2 as LucideSettings2,
  Shield as LucideShield,
  Shuffle as LucideShuffle,
  SlidersHorizontal as LucideSlidersHorizontal,
  Sparkles as LucideSparkles,
  Star as LucideStar,
  Sun as LucideSun,
  Tag as LucideTag,
  Tags as LucideTags,
  Terminal as LucideTerminal,
  Timer as LucideTimer,
  Trash2 as LucideTrash2,
  Upload as LucideUpload,
  User as LucideUser,
  UserCheck as LucideUserCheck,
  UserPlus as LucideUserPlus,
  UserX as LucideUserX,
  Users as LucideUsers,
  Workflow as LucideWorkflow,
  X as LucideX,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type { LucideIcon } from 'lucide-react'

const ICON_MAP = {
  'alert-triangle': LucideAlertTriangle,
  archive: LucideArchive,
  'archive-restore': LucideArchiveRestore,
  'arrow-left': LucideArrowLeft,
  'arrow-right': LucideArrowRight,
  'bar-chart-3': LucideBarChart3,
  braces: LucideBraces,
  check: LucideCheck,
  'chevron-down': LucideChevronDown,
  'chevron-left': LucideChevronLeft,
  'chevron-right': LucideChevronRight,
  'chevron-up': LucideChevronUp,
  'chevrons-up-down': LucideChevronsUpDown,
  code: LucideCode,
  'columns-3': LucideColumns3,
  copy: LucideCopy,
  download: LucideDownload,
  'external-link': LucideExternalLink,
  'file-code': LucideFileCode,
  'file-text': LucideFileText,
  filter: LucideFilter,
  'folder-input': LucideFolderInput,
  gift: LucideGift,
  'git-branch': LucideGitBranch,
  globe: LucideGlobe,
  'globe-2': LucideGlobe2,
  history: LucideHistory,
  inbox: LucideInbox,
  layers: LucideLayers,
  'layout-grid': LucideLayoutGrid,
  /** Lucide "chain" link glyph (avoid `link` — clashes with react-router `<Link>`) */
  hyperlink: LucideLink,
  'link-2': LucideLink2,
  'list-tree': LucideListTree,
  'loader-2': LucideLoader2,
  'log-out': LucideLogOut,
  mail: LucideMail,
  'mail-open': LucideMailOpen,
  moon: LucideMoon,
  network: LucideNetwork,
  pencil: LucidePencil,
  play: LucidePlay,
  plus: LucidePlus,
  'refresh-cw': LucideRefreshCw,
  'rotate-ccw': LucideRotateCcw,
  save: LucideSave,
  search: LucideSearch,
  send: LucideSend,
  settings: LucideSettings,
  'settings-2': LucideSettings2,
  shield: LucideShield,
  shuffle: LucideShuffle,
  'sliders-horizontal': LucideSlidersHorizontal,
  sparkles: LucideSparkles,
  star: LucideStar,
  sun: LucideSun,
  tag: LucideTag,
  tags: LucideTags,
  terminal: LucideTerminal,
  timer: LucideTimer,
  'trash-2': LucideTrash2,
  upload: LucideUpload,
  user: LucideUser,
  'user-check': LucideUserCheck,
  'user-plus': LucideUserPlus,
  'user-x': LucideUserX,
  users: LucideUsers,
  workflow: LucideWorkflow,
  x: LucideX,
} as const satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICON_MAP

const DIM = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const

export type IconSize = keyof typeof DIM

type IconAnimation = 'none' | 'spin' | 'pulse'

export type IconProps = {
  /** Registered icon id (kebab-case, aligned with lucide naming) */
  name: IconName
  /** sm | md | lg (consistent across app; no ad-hoc sizing) */
  size?: IconSize
  /** Only allow common animations via props (no custom className). */
  animation?: IconAnimation
  /**
   * For accessibility; if omitted, the icon is treated as decorative.
   * Use `aria-label` when the icon conveys meaning without adjacent text.
   */
  'aria-label'?: string
  'aria-hidden'?: boolean
} & Omit<LucideProps, 'size' | 'className'>

export const Icon = memo(
  forwardRef<SVGSVGElement, IconProps>(function Icon(
    { name, size = 'md', animation = 'none', ...rest },
    ref,
  ) {
    const Glyph = ICON_MAP[name]
    const animationClass =
      animation === 'spin' ? 'animate-spin'
      : animation === 'pulse' ? 'animate-pulse'
      : undefined
    return (
      <Glyph
        ref={ref}
        className={cn(DIM[size], 'shrink-0', animationClass)}
        {...rest}
      />
    )
  }),
)
