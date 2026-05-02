import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LabeledInput, PrimaryButton, SecondaryButton, SectionHeader, SurfaceCard } from "../components";
import { theme } from "../theme";
import { formatRoleLabel, safePermissions } from "../utils";

export default function ProfileScreen({
  user,
  profileForm,
  onProfileChange,
  onProfileSave,
  passwordForm,
  onPasswordChange,
  onPasswordSave,
  onLogout,
  savingProfile,
  savingPassword
}) {
  const permissions = safePermissions(user?.permissions_json);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SectionHeader
        eyebrow="profil"
        title={user?.full_name || "Foydalanuvchi"}
        description={`${formatRoleLabel(user?.role)} roli uchun mobile profil sozlamalari`}
      />

      <SurfaceCard style={styles.card}>
        <Text style={styles.cardTitle}>Asosiy ma'lumotlar</Text>
        <LabeledInput
          label="F.I.Sh"
          value={profileForm.full_name}
          onChangeText={(value) => onProfileChange("full_name", value)}
          placeholder="To'liq ism"
        />
        <LabeledInput
          label="Telefon"
          value={profileForm.phone}
          onChangeText={(value) => onProfileChange("phone", value)}
          placeholder="998..."
          keyboardType="phone-pad"
        />
        <LabeledInput
          label="Login"
          value={profileForm.login}
          onChangeText={(value) => onProfileChange("login", value)}
          placeholder="login"
          autoCapitalize="none"
        />
        <LabeledInput
          label="Lavozim"
          value={profileForm.department_role}
          onChangeText={(value) => onProfileChange("department_role", value)}
          placeholder="Lavozim"
        />
        <LabeledInput
          label="Avatar URL"
          value={profileForm.avatar_url}
          onChangeText={(value) => onProfileChange("avatar_url", value)}
          placeholder="https://..."
          autoCapitalize="none"
        />
        <PrimaryButton
          label="Profilni saqlash"
          icon="save-outline"
          onPress={onProfileSave}
          loading={savingProfile}
        />
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <Text style={styles.cardTitle}>Parolni yangilash</Text>
        <LabeledInput
          label="Eski parol"
          value={passwordForm.old_password}
          onChangeText={(value) => onPasswordChange("old_password", value)}
          placeholder="Eski parol"
          secureTextEntry
        />
        <LabeledInput
          label="Yangi parol"
          value={passwordForm.new_password}
          onChangeText={(value) => onPasswordChange("new_password", value)}
          placeholder="Yangi parol"
          secureTextEntry
        />
        <PrimaryButton
          label="Parolni saqlash"
          icon="lock-closed-outline"
          onPress={onPasswordSave}
          loading={savingPassword}
          disabled={!passwordForm.old_password || !passwordForm.new_password}
        />
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <Text style={styles.cardTitle}>Ruxsatlar</Text>
        <View style={styles.permissionWrap}>
          {permissions.length ? (
            permissions.map((item) => (
              <View key={item} style={styles.permissionChip}>
                <Text style={styles.permissionText}>{item}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.permissionEmpty}>Mobile uchun ko'rinadigan ruxsatlar shu yerda chiqadi.</Text>
          )}
        </View>
      </SurfaceCard>

      <SecondaryButton label="Chiqish" icon="log-out-outline" onPress={onLogout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 160
  },
  card: {
    gap: 14
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text
  },
  permissionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  permissionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.bgSoft
  },
  permissionText: {
    fontSize: 12,
    color: theme.colors.primaryDeep,
    fontWeight: "700"
  },
  permissionEmpty: {
    fontSize: 14,
    color: theme.colors.textSoft
  }
});
