import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth";
import { api, ApiError, TripEmployeeEntry, OtpChallenge } from "../lib/api";
import { useRealtimeEvent } from "../lib/realtime";

function statusLabel(status: string): string {
  switch (status) {
    case "PLANNED":
      return "Planned";
    case "PICKUP_VERIFIED":
      return "Picked up";
    case "DROP_VERIFIED":
      return "Dropped off";
    case "NO_SHOW":
      return "Marked no-show";
    case "OVERRIDDEN":
      return "Verified by supervisor";
    default:
      return status;
  }
}

function TripCard({ entry, token, onRefresh }: { entry: TripEmployeeEntry; token: string; onRefresh: () => void }) {
  const [otp, setOtp] = useState<{ purpose: "PICKUP" | "DROP"; challenge: OtpChallenge } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGenerate(purpose: "PICKUP" | "DROP") {
    setError(null);
    setBusy(true);
    try {
      const challenge =
        purpose === "PICKUP" ? await api.generatePickupOtp(token, entry.id) : await api.generateDropOtp(token, entry.id);
      setOtp({ purpose, challenge });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate code");
    } finally {
      setBusy(false);
    }
  }

  const assignment = entry.trip.assignments[0];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{entry.trip.globalTripId}</Text>
      <Text style={styles.cardSubtitle}>{new Date(entry.trip.scheduledStartAt).toLocaleTimeString()}</Text>
      <Text style={styles.cardStatus}>{statusLabel(entry.status)}</Text>
      {assignment ? (
        <Text style={styles.cardMeta}>Vehicle assigned · driver on the way</Text>
      ) : (
        <Text style={styles.cardMeta}>Waiting for a driver to be assigned</Text>
      )}

      {otp && (
        <View style={styles.otpBox}>
          <Text style={styles.otpLabel}>{otp.purpose === "PICKUP" ? "Pickup" : "Drop"} code — show to your driver</Text>
          <Text style={styles.otpCode}>{otp.challenge.code}</Text>
          <Text style={styles.otpExpiry}>Expires {new Date(otp.challenge.expiresAt).toLocaleTimeString()}</Text>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.smallButton}
          disabled={busy || entry.status === "PICKUP_VERIFIED" || entry.status === "DROP_VERIFIED"}
          onPress={() => handleGenerate("PICKUP")}
        >
          <Text style={styles.smallButtonText}>Get pickup code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smallButton, styles.secondaryButton]}
          disabled={busy || entry.status !== "PICKUP_VERIFIED"}
          onPress={() => handleGenerate("DROP")}
        >
          <Text style={styles.smallButtonText}>Get drop code</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onRefresh} style={{ marginTop: 8 }}>
        <Text style={styles.refreshLink}>Refresh status</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const { session, logout } = useAuth();
  const [trips, setTrips] = useState<TripEmployeeEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api
      .myTripsToday(session.accessToken)
      .then(setTrips)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load trips"))
      .finally(() => setRefreshing(false));
  }

  useEffect(() => {
    reload();
    // Fallback poll — the socket push below is the primary update path.
    const interval = setInterval(reload, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useRealtimeEvent(session?.accessToken, "trip.status", reload);
  useRealtimeEvent(session?.accessToken, "trip.assignment", reload);

  if (!session) return null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today&rsquo;s trips</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Log out</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              reload();
            }}
          />
        }
        renderItem={({ item }) => <TripCard entry={item} token={session.accessToken} onRefresh={reload} />}
        ListEmptyComponent={<Text style={styles.empty}>No trips scheduled for today.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f8fa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 56,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e5eb",
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  logout: { color: "#c62828" },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e2e5eb" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSubtitle: { color: "#5b6472", fontSize: 13 },
  cardStatus: { marginTop: 8, fontWeight: "600" },
  cardMeta: { color: "#5b6472", fontSize: 13, marginTop: 2 },
  otpBox: { marginTop: 12, alignItems: "center", backgroundColor: "#f0f6ff", borderRadius: 8, padding: 16 },
  otpLabel: { fontSize: 12, color: "#5b6472" },
  otpCode: { fontSize: 36, fontWeight: "700", letterSpacing: 4, marginVertical: 4 },
  otpExpiry: { fontSize: 12, color: "#5b6472" },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  smallButton: { flex: 1, backgroundColor: "#1f6feb", borderRadius: 8, padding: 10, alignItems: "center" },
  secondaryButton: { backgroundColor: "#5b6472" },
  smallButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  refreshLink: { color: "#1f6feb", fontSize: 12, textAlign: "center" },
  error: { color: "#c62828", padding: 8, textAlign: "center" },
  empty: { textAlign: "center", color: "#5b6472", marginTop: 40 },
});
