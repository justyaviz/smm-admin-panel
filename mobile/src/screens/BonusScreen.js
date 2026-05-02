import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DetailModal, EmptyState, SearchBox, SectionHeader, SurfaceCard } from "../components";
import { theme } from "../theme";
import {
  formatContentType,
  formatDate,
  formatMoney,
  getMonthTitle,
  rowMatchesSearch,
  sortByDateAsc
} from "../utils";

function getOwnerLabel(item) {
  if (item.content_type === "video") {
    return [item.video_editor_name, item.video_face_name].filter(Boolean).join(" / ") || "-";
  }
  return item.full_name || "-";
}

export default function BonusScreen({
  monthLabel,
  rows,
  search,
  onSearchChange
}) {
  const [activeRow, setActiveRow] = React.useState(null);

  const visibleRows = sortByDateAsc(rows, "work_date").filter((row) =>
    rowMatchesSearch(
      row,
      [
        "content_title",
        "content_type",
        "full_name",
        "video_editor_name",
        "video_face_name",
        "branch_name",
        "difficulty_level"
      ],
      search
    )
  );

  const totalAmount = visibleRows.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const totalApprove = visibleRows.reduce((sum, item) => sum + Number(item.approved_count || 0), 0);
  const difficultCount = visibleRows.filter((item) => item.difficulty_level === "qiyin").length;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="bonus tizimi"
          title={getMonthTitle(monthLabel)}
          description="Tasdiqlangan birlik va jami bonus summalari iOS ichida kuzatiladi."
        />

        <View style={styles.summaryRow}>
          <SurfaceCard style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Yozuvlar</Text>
            <Text style={styles.summaryValue}>{visibleRows.length}</Text>
          </SurfaceCard>
          <SurfaceCard style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Tasdiq soni</Text>
            <Text style={styles.summaryValue}>{totalApprove}</Text>
          </SurfaceCard>
          <SurfaceCard style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Jami bonus</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalAmount)}</Text>
          </SurfaceCard>
        </View>

        <SurfaceCard style={styles.difficultyCard}>
          <Ionicons name="flame-outline" size={18} color={theme.colors.danger} />
          <Text style={styles.difficultyText}>Qiyin belgilangan bonuslar: {difficultCount} ta</Text>
        </SurfaceCard>

        <SearchBox
          value={search}
          onChangeText={onSearchChange}
          placeholder="Kontent, hodim yoki filial bo'yicha qidiring..."
        />

        {visibleRows.length ? (
          visibleRows.map((item) => (
            <Pressable key={item.id} onPress={() => setActiveRow(item)}>
              <SurfaceCard
                style={[
                  styles.itemCard,
                  item.difficulty_level === "qiyin" ? styles.dangerCard : null
                ]}
              >
                <Text style={styles.itemTitle}>{item.content_title || "Bonus yozuvi"}</Text>
                <View style={styles.metaRow}>
                  <MetaItem icon="calendar-outline" text={formatDate(item.work_date)} />
                  <MetaItem icon="videocam-outline" text={formatContentType(item.content_type)} />
                </View>
                <Text style={styles.metaText}>Hodim: {getOwnerLabel(item)}</Text>
                <Text style={styles.metaText}>Tasdiq soni: {item.approved_count || 0}</Text>
                <Text style={styles.metaText}>Jami: {formatMoney(item.total_amount || 0)}</Text>
              </SurfaceCard>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="Bonus yozuvi topilmadi"
            description="Bu oy uchun bonus kiritilmagan yoki qidiruv natijasi bo'sh."
          />
        )}
      </ScrollView>

      <DetailModal
        visible={!!activeRow}
        title={activeRow?.content_title || "Bonus tafsiloti"}
        onClose={() => setActiveRow(null)}
        data={
          activeRow
            ? [
                { label: "Sana", value: formatDate(activeRow.work_date) },
                { label: "Kontent turi", value: formatContentType(activeRow.content_type) },
                { label: "Hodim", value: getOwnerLabel(activeRow) },
                { label: "Filial", value: activeRow.branch_name || "-" },
                { label: "Taklif soni", value: String(activeRow.proposal_count || 0) },
                { label: "Tasdiq soni", value: String(activeRow.approved_count || 0) },
                { label: "Jami bonus", value: formatMoney(activeRow.total_amount || 0) },
                { label: "Holat", value: activeRow.approval_status || "draft" }
              ]
            : []
        }
      />
    </View>
  );
}

function MetaItem({ icon, text }) {
  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={14} color={theme.colors.primaryDeep} />
      <Text style={styles.metaPillText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 160
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  summaryCard: {
    flex: 1,
    minWidth: 102,
    gap: 8
  },
  summaryLabel: {
    fontSize: 13,
    color: theme.colors.textSoft
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text
  },
  difficultyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF2F4"
  },
  difficultyText: {
    fontSize: 14,
    color: theme.colors.danger,
    fontWeight: "700"
  },
  itemCard: {
    gap: 10
  },
  dangerCard: {
    borderColor: "#F3B0BC",
    backgroundColor: "#FFF8F9"
  },
  itemTitle: {
    fontSize: 17,
    lineHeight: 23,
    color: theme.colors.text,
    fontWeight: "800"
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.bgSoft
  },
  metaPillText: {
    fontSize: 12,
    color: theme.colors.primaryDeep,
    fontWeight: "700"
  },
  metaText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSoft
  }
});
