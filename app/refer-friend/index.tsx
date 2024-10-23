import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";

const ReferFriend = () => {
  const router = useRouter();
  const { userData } = useContext(UserContext);
  const [name, setName] = useState("");
  const [empreendimento, setEmpreendimento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [empreendimentosList, setEmpreendimentosList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEmpreendimentos = async () => {
      setLoading(true);
      try {
        const username = "engenharq-mozart";
        const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
        const credentials = btoa(`${username}:${password}`);

        const response = await axios.get(
          `https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance`,
          {
            params: {
              cpf: userData.cpf,
              correctAnnualInstallment: "N",
            },
            headers: {
              Authorization: `Basic ${credentials}`,
            },
          }
        );

        const results = response.data.results || [];

        // Extrair os empreendimentos dos resultados
        const empreendimentos = results.map((item) => ({
          billReceivableId: item.billReceivableId,
          projectId: item.projectId,
          projectName: item.projectName,
        }));

        setEmpreendimentosList(empreendimentos);
      } catch (error) {
        console.error("Erro ao buscar empreendimentos:", error);
        alert("Erro ao buscar empreendimentos.");
      } finally {
        setLoading(false);
      }
    };

    if (userData && userData.cpf) {
      fetchEmpreendimentos();
    }
  }, [userData]);

  const handleReferFriend = async () => {
    if (!name || !empreendimento || !email || !telefone) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      // Enviar os dados da indicação para o backend
      await axios.post("http://hw0oc4gc8ccwswwg4gk0kss8.167.88.39.225.sslip.io/referrals", {
        referrerCpf: userData.cpf,
        friendName: name,
        empreendimento,
        email,
        telefone,
        observacoes,
      });

      alert("Amigo indicado com sucesso!");
      router.back();
    } catch (error) {
      console.error("Erro ao enviar indicação:", error);
      alert("Erro ao enviar indicação.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra superior com ícone de notificação */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Indicar Amigo</Text>
        <TouchableOpacity onPress={() => router.push("/notification-screen")}>
          <Ionicons name="notifications-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.descriptionText}>
          Indique um amigo preenchendo o formulário abaixo, deixe os contatos
          dele que entraremos em contato.
        </Text>

        {/* Nome */}
        <Text style={styles.label}>NOME</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome do seu amigo"
          value={name}
          onChangeText={setName}
        />

        {/* Empreendimento */}
        <Text style={styles.label}>EMPREENDIMENTO</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#E1272C" />
        ) : (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={empreendimento}
              onValueChange={(itemValue) => setEmpreendimento(itemValue)}
            >
              <Picker.Item label="Selecione um Empreendimento" value="" />
              {empreendimentosList.map((emp) => (
                <Picker.Item
                  key={emp.billReceivableId}
                  label={emp.billReceivableId}
                  value={emp.billReceivableId}
                />
              ))}
            </Picker>
          </View>
        )}

        {/* Email */}
        <Text style={styles.label}>E-MAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="E-mail do seu amigo"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        {/* Telefone */}
        <Text style={styles.label}>TELEFONE</Text>
        <TextInput
          style={styles.input}
          placeholder="(00) 0000-0000"
          value={telefone}
          onChangeText={setTelefone}
          keyboardType="phone-pad"
        />

        {/* Observações */}
        <Text style={styles.label}>OBSERVAÇÕES</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Observações..."
          value={observacoes}
          onChangeText={setObservacoes}
          multiline
          numberOfLines={4}
        />

        {/* Botão de Indicar */}
        <TouchableOpacity style={styles.button} onPress={handleReferFriend}>
          <Text style={styles.buttonText}>INDICAR UM AMIGO</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF6F6",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E1272C",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  topBarTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  descriptionText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#E1272C",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E1272C",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E1272C",
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#333",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ReferFriend;
