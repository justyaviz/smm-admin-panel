import React from "react";
import { Activity, CircleDollarSign, FolderKanban, LayoutGrid, Megaphone, Users, FileBarChart2, Clock3, CheckCircle2, Sparkles } from "lucide-react";
import StatCard from "../components/ui/StatCard";
import DataTable from "../components/ui/DataTable";

function Hero({ summary }) {
  return (
    <div className="hero-shell card fade-up">
      <div className="hero-left">
        <div className="hero-badge"><Sparkles size={14} /> aloo SMM platformasi</div>
        <h1>aloo do‘konlar tarmog‘i SMM jamoasi yagona ma’lumotlar platformasi</h1>
        <p>Kontent reja, filial hisobotlari, KPI, bonus, media va reklama kampaniyalarini bitta joydan boshqaring.</p>
        <div className="hero-actions">
          <button className="btn primary">Hisobot yaratish</button>
          <button className="btn secondary">Media yuklash</button>
        </div>
      </div>
      <div className="hero-right">
        <div className="hero-panel panel-dark">
          <div className="mini-title">Bugungi hisobotlar</div>
          <div className="panel-big">{summary?.today_report_count || 0}</div>
          <div className="mini-note">filiallardan kiritilgan hisobot</div>
        </div>
        <div className="hero-panel panel-blue">
          <div className="mini-title">Jami bonus</div>
          <div className="panel-big">{Number(summary?.total_bonus_amount || 0).toLocaleString()}</div>
          <div className="mini-note">so‘m</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ summary, dailyReports, tasks }) {
  return (
    <div className="page-grid">
      <Hero summary={summary} />
      <div className="stats-grid">
        <StatCard icon={LayoutGrid} title="Kontentlar" value={summary?.content_count || 0} note="rejadagi kontentlar" />
        <StatCard icon={FolderKanban} title="Vazifalar" value={summary?.task_count || 0} note="faol vazifalar" accent="dark" />
        <StatCard icon={Megaphone} title="Kampaniyalar" value={summary?.campaign_count || 0} note="reklama kampaniyalari" />
        <StatCard icon={Users} title="Hodimlar" value={summary?.user_count || 0} note="faol foydalanuvchilar" accent="dark" />
      </div>
      <div className="dashboard-grid">
        <DataTable
          title="So‘nggi filial hisobotlari"
          description="Bugungi va kechagi hisobotlar"
          rows={(dailyReports || []).slice(0, 5)}
          columns={[
            { key: "report_date", label: "Sana" },
            { key: "branch_name", label: "Filial" },
            { key: "stories_count", label: "Stories" },
            { key: "posts_count", label: "Post" },
            { key: "reels_count", label: "Reels" }
          ]}
        />
        <div className="card side-stack fade-up">
          <div className="section-head"><div><h2>Tezkor holat</h2><p>Joriy bloklar</p></div></div>
          <div className="mini-stat"><CircleDollarSign size={16} /> Oylik bonus <strong>{Number(summary?.total_bonus_amount || 0).toLocaleString()} so‘m</strong></div>
          <div className="mini-stat"><Activity size={16} /> Bugungi hisobot <strong>{summary?.today_report_count || 0}</strong></div>
          <div className="mini-stat"><Clock3 size={16} /> Kechikkan vazifalar <strong>{(tasks || []).filter((t) => t.status !== "done").length}</strong></div>
          <div className="mini-stat"><CheckCircle2 size={16} /> KPI bloki <strong>Faol</strong></div>
          <div className="mini-stat"><FileBarChart2 size={16} /> Filial tahlili <strong>Tayyor</strong></div>
        </div>
      </div>
    </div>
  );
}
