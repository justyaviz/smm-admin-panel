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
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'content', label: 'Kontent', icon: FolderKanban },
  { id: 'calendar', label: 'Kalendar', icon: CalendarDays },
  { id: 'campaigns', label: 'Kampaniyalar', icon: Megaphone },
  { id: 'ads', label: 'Target reklama', icon: Target },
  { id: 'analytics', label: 'Analitika', icon: BarChart3 },
  { id: 'reports', label: 'Hisobotlar', icon: FileBarChart },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'branches', label: 'Filiallar', icon: Store },
  { id: 'tasks', label: 'Vazifalar', icon: ClipboardCheck },
  { id: 'team', label: 'Jamoa', icon: UsersRound },
  { id: 'expenses', label: 'Xarajatlar', icon: CircleDollarSign },
  { id: 'chat', label: 'Chat', icon: MessageCircle, dot: true },
  { id: 'settings', label: 'Sozlamalar', icon: Settings },
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
