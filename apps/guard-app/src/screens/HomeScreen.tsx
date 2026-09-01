import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth";
import { api, ApiError, TripAssignmentEntry } from "../lib/api";
import { useRealtimeEvent } from "../lib/realtime";

function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function TripCard({ assignment, token, onRefresh }: { assignment: TripAssignmentEntry; token: string; onRefresh: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trip = assignment.trip;

  async function handleSos() {
    setBusy(true);
    setError(null);
    try {
      await api.raiseSos(token, trip.id, "Guard-raised SOS");
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not raise SOS");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{trip.globalTripId}</Text>
      <Text style={styles.cardSubtitle}>{new Date(trip.scheduledStartAt).toLocaleTimeString()}</Text>
      <Text style={styles.cardStatus}>{statusLabel(trip.status)}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.sosButton} disabled={busy} onPress={handleSos}>
          <Text style={styles.sosButtonText}>Raise SOS</Text>
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
  const [assignments, setAssignments] = useState<TripAssignmentEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!session) return;
    api
      .myTripsToday(session.accessToken)
      .then(setAssignments)
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
        data={assignments}
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
        renderItem={({ item }) => <TripCard assignment={item} token={session.accessToken} onRefresh={reload} />}
        ListEmptyComponent={<Text style={styles.empty}>No trips assigned for today.</Text>}
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
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  sosButton: { flex: 1, backgroundColor: "#c62828", borderRadius: 8, padding: 12, alignItems: "center" },
  sosButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  refreshLink: { color: "#1f6feb", fontSize: 12, textAlign: "center" },
  error: { color: "#c62828", padding: 8, textAlign: "center" },
  empty: { textAlign: "center", color: "#5b6472", marginTop: 40 },
});
