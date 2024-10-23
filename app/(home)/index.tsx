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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";
import { UserContext } from "../contexts/UserContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker"; // Import do DateTimePicker

const Index = () => {
  const [inputValue, setInputValue] = useState(""); // Armazena CPF
  const [password, setPassword] = useState(""); // Armazena a senha
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Acessa setUserData do contexto
  const { setUserData } = useContext(UserContext);

  // Estado para o modal de "Esqueceu a Senha"
  const [modalVisible, setModalVisible] = useState(false);
  const [cpfRecovery, setCpfRecovery] = useState("");
  const [birthDateRecovery, setBirthDateRecovery] = useState(null); // Agora é um objeto Date
  const [showDatePicker, setShowDatePicker] = useState(false); // Controle de visibilidade do DateTimePicker
  const [loadingRecovery, setLoadingRecovery] = useState(false);

  // Função para formatar a data como DD/MM/AAAA
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2,'0');
    const month = (date.getMonth()+1).toString().padStart(2,'0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Função para formatar a data como AAAA-MM-DD
  const formatDateToApi = (date) => {
    const day = date.getDate().toString().padStart(2,'0');
    const month = (date.getMonth()+1).toString().padStart(2,'0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const fetchUserData = async () => {
    if (!inputValue || !password) {
      setError(`Por favor, insira um CPF e a senha.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const username = "engenharq-mozart";
      const apiPassword = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb"; 
      const credentials = btoa(`${username}:${apiPassword}`);

      // Remove caracteres não numéricos do CPF
      const sanitizedCpf = inputValue.replace(/\D/g, '');

      // Verifica se o CPF tem 11 dígitos
      if (sanitizedCpf.length !== 11) {
        setError("CPF inválido.");
        setLoading(false);
        return;
      }

      // Reverte o CPF para obter a senha
      const reversedCpf = sanitizedCpf.split('').reverse().join('');

      if (password !== reversedCpf) {
        setError("Senha incorreta.");
        setLoading(false);
        return;
      }

      // Busca os dados do usuário
      const response = await axios.get(
        `https://api.sienge.com.br/engenharq/public/api/v1/customers?cpf=${sanitizedCpf}&limit=100&offset=0`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        setUserData(response.data.results[0]); // Armazena os dados do cliente no contexto
        router.push("/initial-page"); // Redireciona para a tela inicial
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

  const handleForgotPassword = () => {
    // Abre o modal de recuperação de senha
    setModalVisible(true);
  };

  const handleSendPassword = async () => {
    if (!cpfRecovery || !birthDateRecovery) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }

    setLoadingRecovery(true);

    try {
      const username = "engenharq-mozart";
      const apiPassword = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb"; 
      const credentials = btoa(`${username}:${apiPassword}`);

      // Remove caracteres não numéricos do CPF
      const sanitizedCpf = cpfRecovery.replace(/\D/g, '');

      // Busca os dados do usuário
      const response = await axios.get(
        `https://api.sienge.com.br/engenharq/public/api/v1/customers?cpf=${sanitizedCpf}&limit=100&offset=0`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        const user = response.data.results[0];

        // Compara a data de nascimento
        const birthDateApi = user.birthDate; // Formato 'AAAA-MM-DD'

        if (!birthDateApi) {
          Alert.alert("Erro", "Data de nascimento não encontrada.");
          setLoadingRecovery(false);
          return;
        }

        // Formatar a data de nascimento do usuário selecionada no DatePicker para 'AAAA-MM-DD'
        const birthDateUser = formatDateToApi(birthDateRecovery);

        // Comparar as datas formatadas
        if (birthDateUser !== birthDateApi) {
          Alert.alert("Erro", "Data de nascimento não confere.");
          setLoadingRecovery(false);
          return;
        }

        // Reverte o CPF para obter a senha
        const reversedCpf = sanitizedCpf.split('').reverse().join('');

        // Envia o email com a senha
        const backendUrl = 'https://47ed-177-127-61-77.ngrok-free.app/send-password'; // Substitua pela URL do seu backend

        await axios.post(backendUrl, {
          email: user.email,
          userName: user.name,
          password: reversedCpf,
        });

        Alert.alert("Sucesso", "A senha foi enviada para o seu email.");
        setModalVisible(false);
      } else {
        Alert.alert("Erro", "Cliente não encontrado.");
      }
    } catch (err) {
      Alert.alert("Erro", "Falha ao enviar a senha por email.");
      console.error(err);
    } finally {
      setLoadingRecovery(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>ENGEPAG</Text>

        {/* Campo de entrada para CPF */}
        <View style={styles.inputContainer}>
          <Ionicons
            name="person"
            size={24}
            color="#E1272C"
            style={styles.icon}
          />
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
          <Ionicons
            name="lock-closed"
            size={24}
            color="#E1272C"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="SENHA"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#aaa"
          />
        </View>

        {/* Esqueceu a senha */}
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
        </TouchableOpacity>

        {/* Botão de Acesso */}
        <TouchableOpacity style={styles.accessButton} onPress={fetchUserData}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#007bff"
              style={styles.loading}
            />
          ) : (
            <Text style={styles.accessButtonText}>ACESSAR</Text>
          )}
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Logo */}
        <Image source={require("./homelogo.png")} style={styles.logo} />
      </ScrollView>

      {/* Modal de Recuperação de Senha */}
      {modalVisible && (
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Recuperar Senha</Text>

              {/* Campo de entrada para CPF */}
              <View style={styles.modalInputContainer}>
                <Ionicons
                  name="person"
                  size={24}
                  color="#E1272C"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="CPF"
                  value={cpfRecovery}
                  onChangeText={setCpfRecovery}
                  keyboardType="numeric"
                  placeholderTextColor="#aaa"
                />
              </View>

              {/* Campo de entrada para Data de Nascimento */}
              <View style={styles.modalInputContainer}>
                <Ionicons
                  name="calendar"
                  size={24}
                  color="#E1272C"
                  style={styles.icon}
                />
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {birthDateRecovery ? formatDate(birthDateRecovery) : 'Data de Nascimento (DD/MM/AAAA)'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={birthDateRecovery || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setBirthDateRecovery(selectedDate);
                      }
                    }}
                  />
                )}
              </View>

              {/* Botão para Enviar a Senha */}
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSendPassword}
              >
                {loadingRecovery ? (
                  <ActivityIndicator
                    size="large"
                    color="#007bff"
                    style={styles.loading}
                  />
                ) : (
                  <Text style={styles.modalButtonText}>Enviar Senha</Text>
                )}
              </TouchableOpacity>

              {/* Botão de Cancelar */}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F8",
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
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
  forgotPasswordText: {
    color: "#E1272C",
    fontSize: 14,
    alignSelf: "flex-end",
    marginTop: -15,
    marginBottom: 20,
  },
  accessButton: {
    backgroundColor: "#5B5B5B",
    width: "60%",
    paddingVertical: 15,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
    marginTop: 70,
    marginBottom: 30,
  },
  accessButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loading: {},
  errorText: {
    color: "#E1272C",
    fontWeight: "bold",
    marginTop: 20,
  },
  logo: {
    width: 155,
    height: 89,
    marginBottom: 20,
    alignSelf: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#E1272C",
  },
  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E1272C",
    marginBottom: 20,
    width: "100%",
  },
  modalButton: {
    backgroundColor: "#5B5B5B",
    width: "60%",
    paddingVertical: 15,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
    marginTop: 20,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalCancelButton: {
    marginTop: 10,
  },
  modalCancelButtonText: {
    color: "#E1272C",
    fontSize: 16,
  },
  dateInput: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
});

export default Index;
