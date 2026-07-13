import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handler = (event) => { event.preventDefault(); setPrompt(event); if (!localStorage.getItem('aloo_pwa_dismissed')) setVisible(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  if (!visible || !prompt) return null;
  const install = async () => { await prompt.prompt(); setVisible(false); setPrompt(null); };
  const close = () => { localStorage.setItem('aloo_pwa_dismissed','1'); setVisible(false); };
  return <div className="install-prompt"><span><Smartphone size={22} /></span><div><strong>Panelni telefonga o‘rnating</strong><small>Ilova kabi tez ochiladi va draftlar offline saqlanadi.</small></div><button className="install-button" onClick={install}><Download size={17} /> O‘rnatish</button><button className="install-close" onClick={close}><X size={17} /></button></div>;
}
