import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getStatusMeta } from "./utils";
import { theme } from "./theme";

export function SectionHeader({ eyebrow, title, description, right }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

export function SurfaceCard({ children, style }) {
  return <View style={[styles.surfaceCard, style]}>{children}</View>;
}

export function StatCard({ label, value, icon = "sparkles-outline", accent = theme.colors.primary }) {
  return (
    <SurfaceCard style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </SurfaceCard>
  );
}

export function SearchBox({ value, onChangeText, placeholder = "Qidiruv..." }) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search-outline" size={18} color={theme.colors.textSoft} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSoft}
        value={value}
        onChangeText={onChangeText}
        style={styles.searchInput}
      />
    </View>
  );
}

export function LabeledInput({ label, style, ...props }) {
  return (
    <View style={style}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.textSoft}
        style={[styles.input, props.multiline ? styles.textarea : null]}
        {...props}
      />
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, loading, icon }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryButton,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View style={styles.buttonContent}>
          {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
          <Text style={styles.primaryButtonText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled, icon }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.buttonContent}>
        {icon ? <Ionicons name={icon} size={18} color={theme.colors.text} /> : null}
        <Text style={styles.secondaryButtonText}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function StatusChip({ value }) {
  const meta = getStatusMeta(value);
  return (
    <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
      <Text style={[styles.statusText, { color: meta.fg }]}>{meta.label}</Text>
    </View>
  );
}

export function EmptyState({ title, description }) {
  return (
    <SurfaceCard style={styles.emptyCard}>
      <Ionicons name="layers-outline" size={28} color={theme.colors.textSoft} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </SurfaceCard>
  );
}

export function DetailModal({ visible, title, data = [], onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.iconButton}>
              <Ionicons name="close-outline" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {data.map((item) => (
              <View key={item.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value || "-"}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 4
  },
  eyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: theme.colors.primaryDeep,
    fontWeight: "700"
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: theme.colors.text,
    fontWeight: "800"
  },
  sectionDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSoft
  },
  surfaceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.space.lg
  },
  statCard: {
    gap: 10,
    flex: 1,
    minWidth: 150
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSoft
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text
  },
  searchBox: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 8,
    color: theme.colors.textSoft,
    fontWeight: "600"
  },
  input: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingHorizontal: 16,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface
  },
  textarea: {
    minHeight: 112,
    textAlignVertical: "top",
    paddingVertical: 14
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18
  },
  buttonPressed: {
    opacity: 0.86
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 16
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800"
  },
  emptyCard: {
    alignItems: "center",
    gap: 10
  },
  emptyTitle: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: "800"
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: theme.colors.textSoft
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(16, 24, 40, 0.44)",
    justifyContent: "flex-end"
  },
  modalSheet: {
    minHeight: "60%",
    maxHeight: "86%",
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 18
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    flex: 1,
    paddingRight: 12
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceMuted
  },
  detailRow: {
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textSoft,
    fontWeight: "600"
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
    fontWeight: "600"
  }
});
