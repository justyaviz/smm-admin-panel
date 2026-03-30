import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DetailModal, EmptyState, SearchBox, SectionHeader, StatusChip, SurfaceCard } from "../components";
import { theme } from "../theme";
import {
  formatContentType,
  formatDate,
  getMonthTitle,
  rowMatchesSearch,
  sortByDateAsc
} from "../utils";

function getOwnerLabel(item) {
  if (item.content_type === "video") {
    return [item.video_editor_name, item.video_face_name].filter(Boolean).join(" / ") || "-";
  }
  return item.assignee_name || "-";
}

export default function ContentScreen({
  monthLabel,
  rows,
  search,
  onSearchChange
}) {
  const [activeRow, setActiveRow] = React.useState(null);
  const visibleRows = sortByDateAsc(rows, "publish_date").filter((row) =>
    rowMatchesSearch(
      row,
      [
        "title",
        "status",
        "platform",
        "content_type",
        "assignee_name",
        "video_editor_name",
        "video_face_name",
        "rubric"
      ],
      search
    )
  );

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="kontent reja"
          title={getMonthTitle(monthLabel)}
          description="Oydagi reja, joylash sanasi, rubrika va mas'ullar kesimida ko'rinadi."
        />

        <SearchBox
          value={search}
          onChangeText={onSearchChange}
          placeholder="Kontent, hodim, rubrika yoki tur bo'yicha qidiring..."
        />

        {visibleRows.length ? (
          visibleRows.map((item) => (
            <Pressable key={item.id} onPress={() => setActiveRow(item)}>
              <SurfaceCard style={styles.itemCard}>
                <View style={styles.itemTop}>
                  <Text style={styles.itemTitle}>{item.title || "Kontent"}</Text>
                  <StatusChip value={item.status} />
                </View>

                <View style={styles.metaRow}>
                  <MetaPill icon="calendar-outline" text={formatDate(item.publish_date)} />
                  <MetaPill icon="pricetag-outline" text={formatContentType(item.content_type)} />
                </View>

                <Text style={styles.metaText}>Mas'ul: {getOwnerLabel(item)}</Text>
                <Text style={styles.metaText}>Platforma: {item.platform || "-"}</Text>
                <Text style={styles.metaText}>Rubrika: {item.rubric || "rubrika-yo'q"}</Text>
              </SurfaceCard>
            </Pressable>
          ))
        ) : (
          <EmptyState
            title="Kontent topilmadi"
            description="Bu oy uchun hali yozuv yo'q yoki qidiruv natijasi bo'sh."
          />
        )}
      </ScrollView>

      <DetailModal
        visible={!!activeRow}
        title={activeRow?.title || "Kontent tafsiloti"}
        onClose={() => setActiveRow(null)}
        data={
          activeRow
            ? [
                { label: "Joylash sanasi", value: formatDate(activeRow.publish_date) },
                { label: "Holati", value: activeRow.status },
                { label: "Kontent turi", value: formatContentType(activeRow.content_type) },
                { label: "Rubrika", value: activeRow.rubric || "rubrika-yo'q" },
                { label: "Platforma", value: activeRow.platform || "-" },
                { label: "Mas'ul", value: getOwnerLabel(activeRow) },
                { label: "Izoh", value: activeRow.notes || "-" }
              ]
            : []
        }
      />
    </View>
  );
}

function MetaPill({ icon, text }) {
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
  itemCard: {
    gap: 12
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start"
  },
  itemTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
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
