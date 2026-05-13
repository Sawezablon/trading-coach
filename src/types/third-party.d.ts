declare module "lucide-react" {
  import type { ComponentType, SVGProps } from "react";

  export type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>;
  export const AlertTriangle: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const BadgeCheck: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Bell: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Brain: LucideIcon;
  export const Check: LucideIcon;
  export const CheckIcon: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronDownIcon: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronLeftIcon: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronRightIcon: LucideIcon;
  export const ChevronUpIcon: LucideIcon;
  export const ChevronsUpDown: LucideIcon;
  export const Circle: LucideIcon;
  export const CircleAlert: LucideIcon;
  export const CircleCheckIcon: LucideIcon;
  export const CircleHelp: LucideIcon;
  export const CircleIcon: LucideIcon;
  export const CircleUser: LucideIcon;
  export const CircleXIcon: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const Command: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Database: LucideIcon;
  export const Ellipsis: LucideIcon;
  export const EllipsisVertical: LucideIcon;
  export const File: LucideIcon;
  export const FilePlus2: LucideIcon;
  export const Folder: LucideIcon;
  export const Forward: LucideIcon;
  export const Globe: LucideIcon;
  export const GripVertical: LucideIcon;
  export const ImageIcon: LucideIcon;
  export const InfoIcon: LucideIcon;
  export const Loader2: LucideIcon;
  export const Loader2Icon: LucideIcon;
  export const Lock: LucideIcon;
  export const LogOut: LucideIcon;
  export const MailIcon: LucideIcon;
  export const Menu: LucideIcon;
  export const MessageSquareDot: LucideIcon;
  export const MinusIcon: LucideIcon;
  export const Monitor: LucideIcon;
  export const Moon: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const MoreHorizontalIcon: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const NotebookPen: LucideIcon;
  export const OctagonXIcon: LucideIcon;
  export const PanelLeft: LucideIcon;
  export const PanelLeftIcon: LucideIcon;
  export const Plus: LucideIcon;
  export const PlusCircleIcon: LucideIcon;
  export const Save: LucideIcon;
  export const Search: LucideIcon;
  export const SearchIcon: LucideIcon;
  export const Settings: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Sun: LucideIcon;
  export const Target: LucideIcon;
  export const Trash2: LucideIcon;
  export const TriangleAlertIcon: LucideIcon;
  export const Trophy: LucideIcon;
  export const Upload: LucideIcon;
  export const X: LucideIcon;
  export const XIcon: LucideIcon;
}

declare module "simple-icons" {
  export type SimpleIcon = { path: string; title: string; hex: string };
  export const siGithub: { path: string; title: string; hex: string };
  export const siGoogle: { path: string; title: string; hex: string };
  export const siX: { path: string; title: string; hex: string };
}

declare module "@hookform/resolvers/zod" {
  import type { Resolver } from "react-hook-form";

  export function zodResolver<TSchema, TFieldValues = never>(schema: TSchema): Resolver<TFieldValues>;
}
