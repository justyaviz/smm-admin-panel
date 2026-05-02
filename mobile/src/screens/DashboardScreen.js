import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SectionHeader, StatCard, SurfaceCard } from "../components";
import { theme } from "../theme";
import { formatMoney, getMonthTitle } from "../utils";

export default function DashboardScreen({ user, dashboard, monthLabel, refreshing, onRefresh }) {
  const stats = [
    {
      label: "Oylik kontent",
      value: String(dashboard?.monthly_content_count || 0),
      icon: "images-outline",
      accent: theme.colors.primary
    },
    {
      label: "Bonus summasi",
      value: formatMoney(dashboard?.monthly_bonus_amount || 0),
      icon: "gift-outline",
      accent: theme.colors.accent
    },
    {
      label: "Kechikkan vazifa",
      value: String(dashboard?.overdue_task_count || 0),
      icon: "alert-circle-outline",
      accent: theme.colors.danger
    },
    {
      label: "Jamoa soni",
      value: String(dashboard?.user_count || 0),
      icon: "people-outline",
      accent: theme.colors.warning
    }
  ];

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <SectionHeader
        eyebrow="aloo platforma"
        title={`${getMonthTitle(monthLabel)} holati`}
        description={`${user?.full_name || "Jamoa a'zosi"} uchun tezkor iOS dashboard`}
      />

      <SurfaceCard style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>Asosiy ko'rsatkichlar</Text>
            <Text style={styles.heroText}>
              {dashboard?.executive_summary || "Dashboard ma'lumotlari shu yerda jamlanadi."}
            </Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="pulse-outline" size={26} color={theme.colors.primaryDeep} />
          </View>
        </View>

        <View style={styles.metricGrid}>
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.block}>
        <Text style={styles.blockTitle}>Eslatmalar</Text>
        {(dashboard?.reminders || []).length ? (
          (dashboard.reminders || []).map((item) => (
            <View key={item.id} style={styles.listRow}>
              <Ionicons name="calendar-clear-outline" size={18} color={theme.colors.primaryDeep} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>Muddat: {item.due_date || "-"}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Yaqin muddatli vazifalar topilmadi.</Text>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.block}>
        <Text style={styles.blockTitle}>Smart alert</Text>
        {(dashboard?.smart_alerts || []).length ? (
          (dashboard.smart_alerts || []).map((item, index) => (
            <View key={`${item.type}-${index}`} style={styles.alertRow}>
              <View
                style={[
                  styles.alertDot,
                  { backgroundColor: item.type === "danger" ? theme.colors.danger : theme.colors.warning }
                ]}
              />
              <Text style={styles.alertText}>{item.text}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Hozircha xavfli signal yo'q.</Text>
        )}
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 160
  },
  heroCard: {
    gap: 16
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 6
  },
  heroText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSoft,
    maxWidth: 280
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#EAF4FF",
    justifyContent: "center",
    alignItems: "center"
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  block: {
    gap: 14
  },
  blockTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: theme.colors.text
  },
  listRow: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted
  },
  rowCopy: {
    flex: 1,
    gap: 3
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text
  },
  rowMeta: {
    fontSize: 13,
    color: theme.colors.textSoft
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSoft
  },
  alertRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingVertical: 4
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 6
  },
  alertText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text
  }
});
