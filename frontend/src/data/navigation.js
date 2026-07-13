import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileBarChart,
  FolderKanban,
  Image,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Settings,
  Store,
  Target,
  UsersRound,
} from 'lucide-react';

export const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { id: 'content', label: 'Kontent', icon: FolderKanban, permission: 'content.view' },
  { id: 'calendar', label: 'Kalendar', icon: CalendarDays, permission: 'calendar.view' },
  { id: 'campaigns', label: 'Kampaniyalar', icon: Megaphone, permission: 'campaigns.view' },
  { id: 'ads', label: 'Target reklama', icon: Target, permission: 'ads.view' },
  { id: 'analytics', label: 'Analitika', icon: BarChart3, permission: 'analytics.view' },
  { id: 'reports', label: 'Hisobotlar', icon: FileBarChart, permission: 'reports.view' },
  { id: 'media', label: 'Media', icon: Image, permission: 'media.view' },
  { id: 'branches', label: 'Filiallar', icon: Store, permission: 'branches.view' },
  { id: 'tasks', label: 'Vazifalar', icon: ClipboardCheck, permission: 'tasks.view' },
  { id: 'team', label: 'Jamoa', icon: UsersRound, permission: 'team.view' },
  { id: 'expenses', label: 'Xarajatlar', icon: CircleDollarSign, permission: 'expenses.view' },
  { id: 'chat', label: 'Chat', icon: MessageCircle, dot: true, permission: 'chat.use' },
  { id: 'settings', label: 'Sozlamalar', icon: Settings, permission: 'settings.manage' },
];

export const statusLabels = {
  draft: 'Draft',
  review: 'Tekshiruvda',
  approved: 'Tasdiqlandi',
  scheduled: 'Rejalashtirildi',
  published: 'Chop etildi',
  cancelled: 'Bekor qilindi',
};

export const typeLabels = {
  post: 'Post',
  reels: 'Reels',
  story: 'Story',
  shorts: 'Shorts',
  video: 'Video',
  carousel: 'Karusel',
  banner: 'Banner',
  live: 'Jonli efir',
};
