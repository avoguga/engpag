import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";

const ReferFriend = () => {
  const router = useRouter();
  const { userData } = useContext(UserContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const { enterpriseName } = useLocalSearchParams(); 

  const empreendimento = enterpriseName;


  const handleReferFriend = async () => {
    if (!name || !empreendimento || !email || !telefone) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      // Enviar os dados da indicação para o backend
      await axios.post(
        "http://hw0oc4gc8ccwswwg4gk0kss8.167.88.39.225.sslip.io/referrals",
        {
          referrerCpf: userData.cpf,
          friendName: name,
          empreendimento,
          email,
          telefone,
          observacoes,
        }
      );

      alert("Amigo indicado com sucesso!");
      router.back();
    } catch (error) {
      console.error("Erro ao enviar indicação:", error);
      alert("Erro ao enviar indicação.");
    }
  };

  // Função para aplicar a máscara ao telefone
  const handleTelefoneChange = (text) => {
    // Remover todos os caracteres que não são dígitos
    let cleaned = text.replace(/\D/g, "");

    // Aplicar a máscara
    let formattedNumber = "";

    if (cleaned.length <= 10) {
      // Formato (99) 9999-9999
      if (cleaned.length > 0) {
        formattedNumber = "(" + cleaned.substring(0, 2);
      }
      if (cleaned.length >= 3) {
        formattedNumber += ") " + cleaned.substring(2, 6);
      }
      if (cleaned.length >= 7) {
        formattedNumber += "-" + cleaned.substring(6, 10);
      }
    } else {
      // Formato (99) 99999-9999
      if (cleaned.length > 0) {
        formattedNumber = "(" + cleaned.substring(0, 2);
      }
      if (cleaned.length >= 3) {
        formattedNumber += ") " + cleaned.substring(2, 7);
      }
      if (cleaned.length >= 8) {
        formattedNumber += "-" + cleaned.substring(7, 11);
      }
    }

    setTelefone(formattedNumber);
  };

  return (
    <View style={styles.container}>

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
        <TextInput
          style={[styles.input, { backgroundColor: "#f0f0f0" }]} 
          value={empreendimento} 
          editable={false} 
        />

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
          placeholder="(00) 00000-0000"
          value={telefone}
          onChangeText={handleTelefoneChange}
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
