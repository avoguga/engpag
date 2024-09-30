import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import { UserContext } from "../contexts/UserContext";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

const Index = () => {
  const [inputValue, setInputValue] = useState(""); // Armazena CPF ou CNPJ
  const [searchType, setSearchType] = useState("cpf"); // Define o tipo de busca (CPF ou CNPJ)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Access setUserData from the context
  const { setUserData, userData } = useContext(UserContext);

  const fetchUserData = async () => {
    if (!inputValue) {
      setError(`Por favor, insira um ${searchType.toUpperCase()}.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`); // Codificação base64 com btoa

      // Muda o parâmetro de busca com base no tipo selecionado (CPF ou CNPJ)
      const searchParam =
        searchType === "cpf" ? `cpf=${inputValue}` : `cnpj=${inputValue}`;

      const response = await axios.get(
        `https://api.sienge.com.br/engenharq/public/api/v1/customers?${searchParam}&limit=100&offset=0`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        setUserData(response.data.results[0]); // Store user data in context
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
      <Text style={styles.title}>Pesquisar Cliente</Text>

      {/* Picker para selecionar entre CPF e CNPJ */}
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={searchType}
          style={styles.picker}
          onValueChange={(itemValue) => setSearchType(itemValue)}
        >
          <Picker.Item label="CPF" value="cpf" />
          <Picker.Item label="CNPJ" value="cnpj" />
        </Picker>
        <Ionicons
          name={searchType === "cpf" ? "person-outline" : "business-outline"}
          size={24}
          color="#555"
        />
      </View>

      {/* Campo de entrada que muda o placeholder com base no tipo de busca */}
      <TextInput
        style={styles.input}
        placeholder={`Digite o ${searchType.toUpperCase()} para fazer a pesquisa`}
        value={inputValue}
        onChangeText={setInputValue}
        keyboardType="numeric"
        placeholderTextColor="#aaa"
      />

      {/* Botão de Pesquisa */}
      <TouchableOpacity style={styles.searchButton} onPress={fetchUserData}>
        <Ionicons name="search-outline" size={20} color="#fff" />
        <Text style={styles.searchButtonText}>Pesquisar Cliente</Text>
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#007bff"
          style={styles.loading}
        />
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Exibição dos resultados */}
      {userData && (
        <>
          <View style={styles.resultContainer}>
            <Ionicons name="checkmark-circle-outline" size={40} color="green" />
            <Text style={styles.clientFoundText}>Cliente encontrado!</Text>
            <Text style={styles.clientName}>Nome: {userData.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.debitButton}
            onPress={() => router.push("/debit-balance")}
          >
            <Ionicons name="wallet-outline" size={20} color="#fff" />
            <Text style={styles.debitButtonText}>Ver Débitos do Cliente</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  input: {
    height: 50,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    width: "100%",
    marginBottom: 20,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: "#007bff",
    paddingVertical: 15,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  loading: {
    marginTop: 20,
  },
  errorText: {
    color: "red",
    fontWeight: "bold",
    marginTop: 20,
  },
  resultContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  clientFoundText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "green",
    marginVertical: 10,
  },
  clientName: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
  },
  debitButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },
  debitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
});

export default Index;
