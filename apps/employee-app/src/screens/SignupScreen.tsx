import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { api, ApiError } from "../lib/api";

export default function SignupScreen({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [globalOrgId, setGlobalOrgId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await api.employeeSignup({ globalOrgId, fullName, phone, email, password });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Request submitted</Text>
        <Text style={styles.subtitle}>
          Your employer&rsquo;s transport admin will review your request. Sign in with the same email/password once
          approved.
        </Text>
        <TouchableOpacity onPress={onBackToLogin} style={{ marginTop: 20 }}>
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Request transport access</Text>

      <TextInput style={styles.input} placeholder="Employer's Kruze ID (e.g. KZ-COR-000001)" value={globalOrgId} onChangeText={setGlobalOrgId} autoCapitalize="characters" />
      <TextInput style={styles.input} placeholder="Your name" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit request</Text>}
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
