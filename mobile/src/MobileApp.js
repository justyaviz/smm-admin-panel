import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { api, authStore } from "./api";
import { SurfaceCard } from "./components";
import AuthScreen from "./screens/AuthScreen";
import DashboardScreen from "./screens/DashboardScreen";
import ContentScreen from "./screens/ContentScreen";
import BonusScreen from "./screens/BonusScreen";
import ProfileScreen from "./screens/ProfileScreen";
import { theme } from "./theme";
import { canAccessPage, formatRoleLabel, getMonthLabel } from "./utils";

const TABS = [
  { id: "dashboard", title: "Bosh sahifa", icon: "grid-outline", pageKey: "dashboard" },
  { id: "content", title: "Kontent", icon: "images-outline", pageKey: "content" },
  { id: "bonus", title: "Bonus", icon: "gift-outline", pageKey: "bonus" },
  { id: "profile", title: "Profil", icon: "person-outline", pageKey: "profile" }
];

const EMPTY_PROFILE_FORM = {
  full_name: "",
  phone: "",
  login: "",
  department_role: "",
  avatar_url: ""
};

const EMPTY_PASSWORD_FORM = {
  old_password: "",
  new_password: ""
};

export default function MobileApp() {
  const [booting, setBooting] = useState(true);
  const [loginPending, setLoginPending] = useState(false);
  const [session, setSession] = useState({ token: null, user: null });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [notice, setNotice] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [authForm, setAuthForm] = useState({ identifier: "", password: "" });
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [settings, setSettings] = useState(null);
  const [contentRows, setContentRows] = useState([]);
  const [bonusRows, setBonusRows] = useState([]);
  const [contentSearch, setContentSearch] = useState("");
  const [bonusSearch, setBonusSearch] = useState("");

  const monthLabel = useMemo(() => getMonthLabel(), []);
  const user = session.user;

  const allowedTabs = useMemo(() => {
    const filtered = TABS.filter((item) => canAccessPage(user, item.pageKey));
    return filtered.length ? filtered : TABS.filter((item) => item.id === "profile");
  }, [user]);

  useEffect(() => {
    if (!allowedTabs.some((item) => item.id === activeTab)) {
      setActiveTab(allowedTabs[0]?.id || "profile");
    }
  }, [activeTab, allowedTabs]);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    setProfileForm({
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      login: user?.login || "",
      department_role: user?.department_role || "",
      avatar_url: user?.avatar_url || ""
    });
  }, [user]);

  function showNotice(type, text) {
    setNotice({ type, text });
  }

  async function restoreSession() {
    try {
      const restored = await authStore.restore();

      if (!restored.token) {
        setSession({ token: null, user: null });
        return;
      }

      const me = await api.me();
      setSession({ token: restored.token, user: me.user || restored.user });
      await loadData(me.user || restored.user, { silent: true });
    } catch {
      await authStore.clear();
      setSession({ token: null, user: null });
    } finally {
      setBooting(false);
    }
  }

  async function loadData(nextUser = user, options = {}) {
    const silent = options.silent === true;
    if (!silent) setRefreshing(true);

    try {
      const requests = [
        api.dashboard().then((data) => setDashboard(data)).catch(() => setDashboard(null)),
        api.settings.get().then((data) => setSettings(data)).catch(() => setSettings(null))
      ];

      if (canAccessPage(nextUser, "content")) {
        requests.push(
          api.list("content", { month: monthLabel }).then((rows) => setContentRows(Array.isArray(rows) ? rows : []))
        );
      } else {
        setContentRows([]);
      }

      if (canAccessPage(nextUser, "bonus")) {
        requests.push(
          api.list("bonus-items").then((rows) => {
            const filtered = Array.isArray(rows)
              ? rows.filter(
                  (item) =>
                    (item.month_label || String(item.work_date || "").slice(0, 7)) === monthLabel
                )
              : [];
            setBonusRows(filtered);
          })
        );
      } else {
        setBonusRows([]);
      }

      await Promise.all(requests);
    } catch (error) {
      showNotice("error", error.message || "Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  async function handleLogin() {
    try {
      setLoginPending(true);
      setLoginError("");
      const identifier = authForm.identifier.trim();
      const data = await api.login({
        phone: identifier,
        login: identifier,
        password: authForm.password
      });

      setSession({ token: data.token, user: data.user });
      setAuthForm({ identifier: "", password: "" });
      await loadData(data.user, { silent: true });
      showNotice("success", "Mobile sessiya ochildi");
    } catch (error) {
      setLoginError(error.message || "Kirishda xatolik");
    } finally {
      setLoginPending(false);
      setBooting(false);
    }
  }

  async function handleRefresh() {
    if (!user) return;
    const me = await api.me().catch(() => null);
    if (me?.user) {
      setSession((prev) => ({ ...prev, user: me.user }));
      await loadData(me.user);
      return;
    }
    await loadData(user);
  }

  async function handleProfileSave() {
    try {
      setSavingProfile(true);
      const data = await api.updateProfile(profileForm);
      const updatedUser = data.user || profileForm;
      setSession((prev) => ({ ...prev, user: updatedUser }));
      await authStore.save(session.token, updatedUser);
      showNotice("success", "Profil saqlandi");
    } catch (error) {
      showNotice("error", error.message || "Profilni saqlab bo'lmadi");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave() {
    try {
      setSavingPassword(true);
      await api.changePassword(passwordForm);
      setPasswordForm(EMPTY_PASSWORD_FORM);
      showNotice("success", "Parol yangilandi");
    } catch (error) {
      showNotice("error", error.message || "Parolni yangilab bo'lmadi");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    await authStore.clear();
    setSession({ token: null, user: null });
    setDashboard(null);
    setSettings(null);
    setContentRows([]);
    setBonusRows([]);
    setNotice({ type: "success", text: "Sessiya yopildi" });
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.bootWrap}>
          <View style={styles.bootBadge}>
            <Ionicons name="phone-portrait-outline" size={28} color={theme.colors.primary} />
          </View>
          <Text style={styles.bootTitle}>iOS mobile app tayyorlanmoqda</Text>
          <Text style={styles.bootText}>Sessiya tekshirilmoqda va backendga ulanish sinovdan o'tmoqda.</Text>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <AuthScreen
          form={authForm}
          onChange={(key, value) => setAuthForm((prev) => ({ ...prev, [key]: value }))}
          onSubmit={handleLogin}
          loading={loginPending}
          errorMessage={loginError}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <ScrollView
          horizontal
          style={styles.headerStrip}
          contentContainerStyle={styles.headerStripContent}
          showsHorizontalScrollIndicator={false}
        >
          <SurfaceCard style={styles.headerCard}>
            <Text style={styles.headerEyebrow}>aloo mobile</Text>
            <Text style={styles.headerTitle}>Web panelga zarar bermaydigan alohida iOS frontend</Text>
            <Text style={styles.headerText}>
              Hozircha login, dashboard, kontent, bonus va profil birinchi versiyada tayyor.
            </Text>
          </SurfaceCard>

          <SurfaceCard style={styles.userCard}>
            <Avatar user={user} />
            <View style={styles.userCopy}>
              <Text style={styles.userName}>{user.full_name || "Foydalanuvchi"}</Text>
              <Text style={styles.userRole}>{formatRoleLabel(user.role)}</Text>
            </View>
          </SurfaceCard>
        </ScrollView>

        {notice ? (
          <Pressable
            style={[
              styles.notice,
              notice.type === "error" ? styles.noticeError : styles.noticeSuccess
            ]}
            onPress={() => setNotice(null)}
          >
            <Ionicons
              name={notice.type === "error" ? "alert-circle-outline" : "checkmark-circle-outline"}
              size={18}
              color={notice.type === "error" ? theme.colors.danger : theme.colors.success}
            />
            <Text style={styles.noticeText}>{notice.text}</Text>
          </Pressable>
        ) : null}

        <View style={styles.contentArea}>
          {activeTab === "dashboard" ? (
            <DashboardScreen
              user={user}
              dashboard={dashboard}
              settings={settings}
              monthLabel={monthLabel}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          ) : null}

          {activeTab === "content" ? (
            <ContentScreen
              monthLabel={monthLabel}
              rows={contentRows}
              search={contentSearch}
              onSearchChange={setContentSearch}
            />
          ) : null}

          {activeTab === "bonus" ? (
            <BonusScreen
              monthLabel={monthLabel}
              rows={bonusRows}
              search={bonusSearch}
              onSearchChange={setBonusSearch}
            />
          ) : null}

          {activeTab === "profile" ? (
            <ProfileScreen
              user={user}
              profileForm={profileForm}
              onProfileChange={(key, value) => setProfileForm((prev) => ({ ...prev, [key]: value }))}
              onProfileSave={handleProfileSave}
              passwordForm={passwordForm}
              onPasswordChange={(key, value) => setPasswordForm((prev) => ({ ...prev, [key]: value }))}
              onPasswordSave={handlePasswordSave}
              onLogout={handleLogout}
              savingProfile={savingProfile}
              savingPassword={savingPassword}
            />
          ) : null}
        </View>

        <View style={styles.tabBarWrap}>
          <SurfaceCard style={styles.tabBar}>
            {allowedTabs.map((item) => {
              const active = item.id === activeTab;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setActiveTab(item.id)}
                  style={[styles.tabButton, active ? styles.tabButtonActive : null]}
                >
                  <Ionicons
                    name={active ? item.icon.replace("-outline", "") : item.icon}
                    size={20}
                    color={active ? "#FFFFFF" : theme.colors.textSoft}
                  />
                  <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                    {item.title}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable style={styles.refreshButton} onPress={handleRefresh}>
              <Ionicons name="refresh-outline" size={20} color={theme.colors.primaryDeep} />
            </Pressable>
          </SurfaceCard>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Avatar({ user }) {
  if (user?.avatar_url) {
    return <Image source={{ uri: user.avatar_url }} style={styles.avatar} />;
  }

  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarLetter}>{String(user?.full_name || "A").charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg
  },
  shell: {
    flex: 1
  },
  bootWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12
  },
  bootBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#E6F3FF",
    alignItems: "center",
    justifyContent: "center"
  },
  bootTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: theme.colors.text,
    textAlign: "center"
  },
  bootText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSoft,
    textAlign: "center",
    marginBottom: 8
  },
  headerStrip: {
    maxHeight: 170
  },
  headerStripContent: {
    paddingTop: 18,
    paddingHorizontal: 20,
    gap: 12
  },
  headerCard: {
    width: 300,
    gap: 10,
    backgroundColor: "#F9FDFF"
  },
  headerEyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    color: theme.colors.primaryDeep,
    fontWeight: "800"
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 29,
    color: theme.colors.text,
    fontWeight: "900"
  },
  headerText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSoft
  },
  userCard: {
    width: 185,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#CFE9FF"
  },
  avatarFallback: {
    justifyContent: "center",
    alignItems: "center"
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.primaryDeep
  },
  userCopy: {
    flex: 1,
    gap: 4
  },
  userName: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text
  },
  userRole: {
    fontSize: 13,
    color: theme.colors.textSoft
  },
  notice: {
    marginTop: 10,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  noticeSuccess: {
    backgroundColor: "#ECFFF6"
  },
  noticeError: {
    backgroundColor: "#FFF3F6"
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text
  },
  contentArea: {
    flex: 1
  },
  tabBarWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10
  },
  tabButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary
  },
  tabLabel: {
    fontSize: 11,
    color: theme.colors.textSoft,
    fontWeight: "700"
  },
  tabLabelActive: {
    color: "#FFFFFF"
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bgSoft
  }
});
