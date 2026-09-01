import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useAuth } from "../lib/auth";
import { api, ApiError } from "../lib/api";

export default function LoginScreen({ onGoToClaim }: { onGoToClaim: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth();

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const result = await api.login(email, password);
      if (!result.accessToken || !result.organisationId || !result.role) {
        setError("This account belongs to multiple vendors — not supported in this app yet.");
        return;
      }
      if (result.role !== "DRIVER") {
        setError("This app is for drivers. Your account is not a driver account.");
        return;
      }
      setSession({ accessToken: result.accessToken, organisationId: result.organisationId, role: result.role });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kruze</Text>
      <Text style={styles.subtitle}>Driver</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity onPress={onGoToClaim} style={{ marginTop: 20 }}>
        <Text style={styles.link}>First time here? Set up your mobile login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f7f8fa" },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#5b6472", textAlign: "center", marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e5eb",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  button: { backgroundColor: "#1f6feb", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#c62828", marginTop: 12, textAlign: "center" },
  link: { color: "#1f6feb", textAlign: "center" },
});
