import { BarChart3, BookOpen, Database, FilePlus2, type LucideIcon, Settings } from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Trading Coach",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: BarChart3,
      },
      {
        title: "Journal",
        url: "/dashboard/journal",
        icon: BookOpen,
      },
      {
        title: "New Trade",
        url: "/dashboard/upload",
        icon: FilePlus2,
        isNew: true,
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
        subItems: [
          {
            title: "Trading Rules",
            url: "/dashboard/settings",
          },
          {
            title: "Performance Plan",
            url: "/dashboard/settings/performance",
          },
          {
            title: "MT5 Sync",
            url: "/dashboard/settings/mt5",
            icon: Database,
          },
        ],
      },
    ],
  },
];
