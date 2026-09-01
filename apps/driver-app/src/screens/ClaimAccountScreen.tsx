import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useAuth } from "../lib/auth";
import { api, ApiError } from "../lib/api";

/**
 * A driver's identity is created by their vendor (fleet owner), never
 * self-signed-up — this screen only lets an already-onboarded driver set
 * up their own mobile login, by re-proving who they are (global driver ID
 * + the phone number the vendor registered) and picking a password.
 */
export default function ClaimAccountScreen({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [globalDriverId, setGlobalDriverId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth();

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const result = await api.claimAccount({ globalDriverId, phone, email, password });
      if (result.accessToken && result.organisationId && result.role) {
        setSession({ accessToken: result.accessToken, organisationId: result.organisationId, role: result.role });
        return;
      }
      onBackToLogin();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not set up your login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Set up mobile login</Text>
      <Text style={styles.subtitle}>Ask your fleet office for your Driver ID (e.g. KZ-DRV-000001) if you don&rsquo;t have it.</Text>

      <TextInput style={styles.input} placeholder="Driver ID (e.g. KZ-DRV-000001)" value={globalDriverId} onChangeText={setGlobalDriverId} autoCapitalize="characters" />
      <TextInput style={styles.input} placeholder="Phone number on file" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Choose a password" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Set up login</Text>}
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity onPress={onBackToLogin} style={{ marginTop: 20 }}>
        <Text style={styles.link}>Back to sign in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: "#f7f8fa" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#5b6472", marginBottom: 16 },
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
