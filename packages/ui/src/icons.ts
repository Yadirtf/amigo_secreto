/**
 * Icon map (identidad-visual §5). Imported one file at a time so the bundle
 * only ships the icons we use.
 */
import type { LucideIcon } from 'lucide-react-native';
import AlarmClock from 'lucide-react-native/icons/alarm-clock';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Ban from 'lucide-react-native/icons/ban';
import Bell from 'lucide-react-native/icons/bell';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import Camera from 'lucide-react-native/icons/camera';
import Check from 'lucide-react-native/icons/check';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import ClipboardPaste from 'lucide-react-native/icons/clipboard-paste';
import Clock from 'lucide-react-native/icons/clock';
import Copy from 'lucide-react-native/icons/copy';
import DoorOpen from 'lucide-react-native/icons/door-open';
import EllipsisVertical from 'lucide-react-native/icons/ellipsis-vertical';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import Flag from 'lucide-react-native/icons/flag';
import Gift from 'lucide-react-native/icons/gift';
import ImageIcon from 'lucide-react-native/icons/image';
import Info from 'lucide-react-native/icons/info';
import Link from 'lucide-react-native/icons/link';
import ListChecks from 'lucide-react-native/icons/list-checks';
import Lock from 'lucide-react-native/icons/lock';
import LockOpen from 'lucide-react-native/icons/lock-open';
import LogOut from 'lucide-react-native/icons/log-out';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import Send from 'lucide-react-native/icons/send';
import Settings from 'lucide-react-native/icons/settings';
import Share2 from 'lucide-react-native/icons/share-2';
import Shirt from 'lucide-react-native/icons/shirt';
import Shuffle from 'lucide-react-native/icons/shuffle';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Ticket from 'lucide-react-native/icons/ticket';
import Trash2 from 'lucide-react-native/icons/trash-2';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import UserMinus from 'lucide-react-native/icons/user-minus';
import UserX from 'lucide-react-native/icons/user-x';
import Users from 'lucide-react-native/icons/users';
import Wallet from 'lucide-react-native/icons/wallet';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import X from 'lucide-react-native/icons/x';

export const Icons = {
  alarm: AlarmClock,
  back: ArrowLeft,
  ban: Ban,
  bell: Bell,
  calendar: CalendarDays,
  camera: Camera,
  check: Check,
  chevronRight: ChevronRight,
  error: CircleAlert,
  success: CircleCheck,
  paste: ClipboardPaste,
  clock: Clock,
  copy: Copy,
  leave: DoorOpen,
  more: EllipsisVertical,
  eye: Eye,
  eyeOff: EyeOff,
  flag: Flag,
  gift: Gift,
  image: ImageIcon,
  info: Info,
  link: Link,
  wishlist: ListChecks,
  lock: Lock,
  unlock: LockOpen,
  logout: LogOut,
  chat: MessageCircle,
  edit: Pencil,
  plus: Plus,
  send: Send,
  settings: Settings,
  share: Share2,
  size: Shirt,
  draw: Shuffle,
  sparkles: Sparkles,
  code: Ticket,
  trash: Trash2,
  warning: TriangleAlert,
  removeUser: UserMinus,
  exclusion: UserX,
  users: Users,
  budget: Wallet,
  offline: WifiOff,
  close: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof Icons;
