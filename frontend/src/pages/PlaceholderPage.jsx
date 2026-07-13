import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title, description }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-card"><span><Construction size={34} /></span><h1>{title}</h1><p>{description || 'Ushbu modul keyingi bosqichda ishlab chiqiladi.'}</p></div>
    </div>
  );
}
