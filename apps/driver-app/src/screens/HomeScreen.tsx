import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth";
import { api, ApiError, TripAssignmentEntry, TripEmployeeEntry } from "../lib/api";
import { useRealtimeEvent } from "../lib/realtime";

const NEXT_STATUS: Record<string, { status: string; label: string } | undefined> = {
  RESOURCES_ASSIGNED: { status: "DRIVER_ACCEPTED", label: "Accept trip" },
  DRIVER_ACCEPTED: { status: "EN_ROUTE_TO_FIRST_PICKUP", label: "Start driving to pickup" },
  EN_ROUTE_TO_FIRST_PICKUP: { status: "RUNNING", label: "Start trip" },
  RUNNING: { status: "COMPLETED", label: "Complete trip" },
};

function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function PassengerRow({
  entry,
  token,
  onVerified,
}: {
  entry: TripEmployeeEntry;
  token: string;
  onVerified: () => void;
}) {
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const purpose = entry.status === "PLANNED" ? "PICKUP" : entry.status === "PICKUP_VERIFIED" ? "DROP" : null;

  async function handleVerify() {
    if (!purpose) return;
    setError(null);
    setBusy(true);
    try {
      const pending = await api.findPendingOtp(token, entry.id, purpose);
      await api.verifyOtp(token, pending.otpChallengeId, codeInput.trim());
      setCodeInput("");
      onVerified();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.passengerRow}>
      <Text style={styles.passengerStatus}>{statusLabel(entry.status)}</Text>
      {purpose && (
        <View style={styles.otpRow}>
          <TextInput
            style={styles.otpInput}
            placeholder={`${purpose === "PICKUP" ? "Pickup" : "Drop"} code`}
            value={codeInput}
            onChangeText={setCodeInput}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={styles.verifyButton} disabled={busy || codeInput.length !== 6} onPress={handleVerify}>
            <Text style={styles.verifyButtonText}>Verify</Text>
          </TouchableOpacity>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function TripCard({ assignment, token, onRefresh }: { assignment: TripAssignmentEntry; token: string; onRefresh: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trip = assignment.trip;
  const next = NEXT_STATUS[trip.status];

  async function handleAdvance() {
    if (!next) return;
    setError(null);
    setBusy(true);
    try {
      await api.transitionTrip(token, trip.id, next.status);
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update trip status");
    } finally {
      setBusy(false);
    }
  }

  async function handleSos() {
    setBusy(true);
    try {
      await api.raiseSos(token, trip.id, "Driver-raised SOS");
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

      {trip.employees.length > 0 && (
        <View style={styles.passengerList}>
          {trip.employees.map((e) => (
            <PassengerRow key={e.id} entry={e} token={token} onVerified={onRefresh} />
          ))}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.buttonRow}>
        {next && (
          <TouchableOpacity style={styles.smallButton} disabled={busy} onPress={handleAdvance}>
            <Text style={styles.smallButtonText}>{next.label}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.smallButton, styles.sosButton]} disabled={busy} onPress={handleSos}>
          <Text style={styles.smallButtonText}>SOS</Text>
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
  passengerList: { marginTop: 12, gap: 10 },
  passengerRow: { backgroundColor: "#f7f8fa", borderRadius: 8, padding: 10 },
  passengerStatus: { fontSize: 13, fontWeight: "600" },
  otpRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  otpInput: { flex: 1, borderWidth: 1, borderColor: "#e2e5eb", borderRadius: 6, padding: 8, backgroundColor: "#fff" },
  verifyButton: { backgroundColor: "#1f6feb", borderRadius: 6, paddingHorizontal: 14, justifyContent: "center" },
  verifyButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  smallButton: { flex: 1, backgroundColor: "#1f6feb", borderRadius: 8, padding: 10, alignItems: "center" },
  sosButton: { backgroundColor: "#c62828", flex: 0, paddingHorizontal: 18 },
  smallButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  refreshLink: { color: "#1f6feb", fontSize: 12, textAlign: "center" },
  error: { color: "#c62828", padding: 8, textAlign: "center" },
  empty: { textAlign: "center", color: "#5b6472", marginTop: 40 },
});
