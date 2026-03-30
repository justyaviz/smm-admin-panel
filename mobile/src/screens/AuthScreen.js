import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE } from "../api";
import { LabeledInput, PrimaryButton, SurfaceCard } from "../components";
import { theme } from "../theme";

export default function AuthScreen({
  form,
  onChange,
  onSubmit,
  loading,
  errorMessage
}) {
  return (
    <View style={styles.page}>
      <View style={styles.heroGlow} />
      <Text style={styles.eyebrow}>aloo iOS app</Text>
      <Text style={styles.title}>iPhone uchun boshqaruv ilovasi</Text>
      <Text style={styles.description}>
        Web panel asosiy boshqaruv joyi bo'lib qoladi. Mobile app esa rahbar va jamoa uchun tezkor kuzatuv, login va asosiy hisobotlar uchun ishlaydi.
      </Text>

      <SurfaceCard style={styles.formCard}>
        <View style={styles.logoWrap}>
          <View style={styles.logoBadge}>
            <Ionicons name="phone-portrait-outline" size={26} color={theme.colors.primary} />
          </View>
          <View style={styles.logoCopy}>
            <Text style={styles.logoTitle}>aloo mobile</Text>
            <Text style={styles.logoText}>iOS build uchun birinchi versiya</Text>
          </View>
        </View>

        <LabeledInput
          label="Telefon yoki login"
          value={form.identifier}
          onChangeText={(value) => onChange("identifier", value)}
          placeholder="998939000 yoki admin"
          autoCapitalize="none"
        />

        <LabeledInput
          label="Parol"
          value={form.password}
          onChangeText={(value) => onChange("password", value)}
          placeholder="Parol"
          secureTextEntry
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <PrimaryButton
          label="Kirish"
          icon="arrow-forward-outline"
          onPress={onSubmit}
          loading={loading}
          disabled={!form.identifier.trim() || !form.password.trim()}
        />

        <View style={styles.noteBox}>
          <Ionicons name="cloud-outline" size={18} color={theme.colors.primaryDeep} />
          <Text style={styles.noteText}>API manzil: {API_BASE}</Text>
        </View>
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 30,
    backgroundColor: theme.colors.bg
  },
  heroGlow: {
    position: "absolute",
    top: 80,
    left: 10,
    right: 10,
    height: 240,
    borderRadius: 999,
    backgroundColor: "#BDE6FF",
    opacity: 0.55
  },
  eyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.8,
    color: theme.colors.primaryDeep,
    fontWeight: "800",
    marginBottom: 12
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: theme.colors.text
  },
  description: {
    marginTop: 14,
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textSoft
  },
  formCard: {
    gap: 16
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 6
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#E6F3FF",
    justifyContent: "center",
    alignItems: "center"
  },
  logoCopy: {
    flex: 1
  },
  logoTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.text
  },
  logoText: {
    fontSize: 14,
    color: theme.colors.textSoft
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.danger,
    fontWeight: "700"
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.bgSoft
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSoft
  }
});
