import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";

const ReferFriend = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [empreendimento, setEmpreendimento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const handleReferFriend = () => {
    console.log({
      name,
      empreendimento,
      email,
      telefone,
      observacoes,
    });
    alert("Amigo indicado com sucesso!");
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Barra superior com ícone de notificação */}
      <View style={styles.topBar}>
        <Ionicons name="menu" size={30} color="white" />
        <Ionicons name="notifications-outline" size={30} color="white" />
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
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={empreendimento}
            onValueChange={(itemValue) => setEmpreendimento(itemValue)}
          >
            <Picker.Item label="Selecione um Empreendimento" value="" />
            <Picker.Item label="Empreendimento 1" value="Empreendimento 1" />
            <Picker.Item label="Empreendimento 2" value="Empreendimento 2" />
            <Picker.Item label="Empreendimento 3" value="Empreendimento 3" />
          </Picker>
        </View>

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
