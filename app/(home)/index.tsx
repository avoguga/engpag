import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import { UserContext } from "../contexts/UserContext";
import { Ionicons } from "@expo/vector-icons";

const Index = () => {
  const [inputValue, setInputValue] = useState(""); // Armazena CPF ou CNPJ
  const [password, setPassword] = useState(""); // Armazena a senha
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Access setUserData from the context
  const { setUserData } = useContext(UserContext); 

  const fetchUserData = async () => {
    if (!inputValue || !password) {
      setError(`Por favor, insira um CPF e a senha.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const username = "engenharq-mozart";
      const passwordApi = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${passwordApi}`); // Codificação base64 com btoa

      // Muda o parâmetro de busca com base no CPF
      const searchParam = `cpf=${inputValue}`;

      const response = await axios.get(
        `https://api.sienge.com.br/engenharq/public/api/v1/customers?${searchParam}&limit=100&offset=0`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        setUserData(response.data.results[0]); // Armazena os dados do cliente no contexto
        router.push("/initial-page"); // Redireciona diretamente para a tela de débitos
      } else {
        setError("Cliente não encontrado.");
      }
    } catch (err) {
      setError("Falha ao buscar dados do cliente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ENGEPAG</Text>

      {/* Campo de entrada para CPF */}
      <View style={styles.inputContainer}>
        <Ionicons name="person" size={24} color="#E1272C" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="CPF"
          value={inputValue}
          onChangeText={setInputValue}
          keyboardType="numeric"
          placeholderTextColor="#aaa"
        />
      </View>

      {/* Campo de entrada para Senha */}
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed" size={24} color="#E1272C" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="SENHA"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#aaa"
        />
      </View>

      {/* Botão de Acesso */}
      <TouchableOpacity style={styles.accessButton} onPress={fetchUserData}>
        <Text style={styles.accessButtonText}>ACESSAR</Text>
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator size="large" color="#007bff" style={styles.loading} />
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Logo */}
      <Image
        source={require('./homelogo.png')} 
        style={styles.logo} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF8F8",
  },
  title: {
    fontSize: 60,
    fontWeight: "bold",
    marginBottom: 90,
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E1272C",
    marginBottom: 20,
    width: "100%",
  },
  icon: {
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333",
  },
  accessButton: {
    backgroundColor: "#5B5B5B",
    width: "60%",
    paddingVertical: 15,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
    marginTop: 70,
    marginBottom: 90,
  },
  accessButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loading: {
    marginTop: 20,
  },
  errorText: {
    color: "#E1272C",
    fontWeight: "bold",
    marginTop: 20,
  },
  logo: {
    width: 100,
    height: 100,
    position: 'absolute',
    bottom: 20, 
    alignSelf: 'center', 
  },
});

export default Index;
