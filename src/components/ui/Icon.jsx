import {
  House, CalendarBlank, CalendarCheck, GraduationCap, FolderSimple, Ticket, ChartLineUp, UsersThree,
  EnvelopeSimple, Clock, VideoCamera, Globe, NotePencil, Target, Plant, FlowerLotus, ChatCircleText,
  Trophy, Briefcase, Books, Check, CheckCircle, WarningCircle, XCircle, X, UploadSimple, Lock,
  CreditCard, SignOut, ArrowRight, Sparkle, FileText, LinkSimple, PaperPlaneTilt, CurrencyCircleDollar,
  List, Receipt, Student, Info, Gear, ChartBar, DownloadSimple, Eye, Trash, MagnifyingGlass, ArrowLeft, Bell, UserCircle,
} from '@phosphor-icons/react';

// One place that decides which icon means what, so the whole site stays consistent.
const ICONS = {
  home: House, calendar: CalendarBlank, booked: CalendarCheck, lessons: GraduationCap, files: FolderSimple,
  credits: Ticket, progress: ChartLineUp, students: UsersThree, mail: EnvelopeSimple, clock: Clock,
  video: VideoCamera, globe: Globe, notes: NotePencil, target: Target, grow: Plant, logo: FlowerLotus,
  chat: ChatCircleText, trophy: Trophy, business: Briefcase, books: Books, check: Check, success: CheckCircle,
  warning: WarningCircle, error: XCircle, close: X, upload: UploadSimple, lock: Lock, card: CreditCard,
  signout: SignOut, arrow: ArrowRight, sparkle: Sparkle, doc: FileText, link: LinkSimple, send: PaperPlaneTilt,
  money: CurrencyCircleDollar, menu: List, receipt: Receipt, student: Student, info: Info, settings: Gear,
  chart: ChartBar, download: DownloadSimple, view: Eye, trash: Trash, search: MagnifyingGlass, back: ArrowLeft, bell: Bell, user: UserCircle,
};

/** Decorative by default (hidden from screen readers). Pass `label` when the icon alone carries meaning. */
export default function Icon({ name, size = '1em', weight = 'regular', label, className = '', ...rest }) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return (
    <Cmp
      size={size}
      weight={weight}
      className={`icon ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      {...rest}
    />
  );
}
