import React, { useState, useContext, useEffect, useRef } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

const Index = () => {
  const [inputValue, setInputValue] = useState(""); // CPF ou CNPJ formatado
  const [password, setPassword] = useState(""); // Armazena a senha
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const router = useRouter();

  const { setUserData } = useContext(UserContext);

  const [modalVisible, setModalVisible] = useState(false);
  const [cpfRecovery, setCpfRecovery] = useState("");
  const [loadingRecovery, setLoadingRecovery] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        let userDataString;

        if (Platform.OS === "web") {
          userDataString = localStorage.getItem("userData");
        } else {
          userDataString = await AsyncStorage.getItem("userData");
        }

        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUserData(userData);
          router.replace("/initial-page");
        }
      } catch (e) {
        console.error("Failed to load user data from storage", e);
      }
    };

    checkLoginStatus();
  }, []);

  const formatCpfCnpj = (value) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 11) {
      // Máscara CPF: XXX.XXX.XXX-XX
      let cpf = numericValue.replace(/(\d{3})(\d)/, '$1.$2');
      cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
      cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      return cpf;
    } else {
      // Máscara CNPJ: XX.XXX.XXX/XXXX-XX
      let cnpj = numericValue.replace(/^(\d{2})(\d)/, '$1.$2');
      cnpj = cnpj.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      cnpj = cnpj.replace(/\.(\d{3})(\d)/, '.$1/$2');
      cnpj = cnpj.replace(/(\d{4})(\d)/, '$1-$2');
      return cnpj;
    }
  };

  const isValidCpf = (cpf) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) {
      return false;
    }
    if (/^(\d)\1+$/.test(cpf)) {
      return false;
    }
    let sum = 0;
    let rest;
    for (let i = 1; i <= 9; i++) {
      sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) {
      rest = 0;
    }
    if (rest !== parseInt(cpf.substring(9, 10))) {
      return false;
    }
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) {
      rest = 0;
    }
    if (rest !== parseInt(cpf.substring(10, 11))) {
      return false;
    }
    return true;
  };

  const isValidCnpj = (cnpj) => {
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) {
      return false;
    }
    if (/^(\d)\1+$/.test(cnpj)) {
      return false;
    }
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += numbers.charAt(length - i) * pos--;
      if (pos < 2) {
        pos = 9;
      }
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) {
      return false;
    }
    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += numbers.charAt(length - i) * pos--;
      if (pos < 2) {
        pos = 9;
      }
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) {
      return false;
    }
    return true;
  };

  const fetchUserData = async () => {
    if (!inputValue || !password) {
      Alert.alert("Erro", "Por favor, insira um CPF/CNPJ e a senha.");
      return;
    }

    setLoading(true);
    setInputError("");
    setPasswordError("");

    try {
      const credentials = btoa(
        "engenharq-mozart:i94B1q2HUXf7PP7oscuIBygquSRZ9lhb"
      );

      const sanitizedInput = inputValue.replace(/\D/g, '');

      // Verifica se o valor é CPF (11 dígitos) ou CNPJ (14 dígitos)
      const isCpf = sanitizedInput.length === 11;
      const isCnpj = sanitizedInput.length === 14;

      if (!isCpf && !isCnpj) {
        setInputError("CPF ou CNPJ inválido.");
        setLoading(false);
        return;
      }

      if (isCpf && !isValidCpf(sanitizedInput)) {
        setInputError("CPF inválido.");
        setLoading(false);
        return;
      }

      if (isCnpj && !isValidCnpj(sanitizedInput)) {
        setInputError("CNPJ inválido.");
        setLoading(false);
        return;
      }

      // Define a senha como os primeiros 6 dígitos para CPF e últimos 6 dígitos para CNPJ
      const expectedPassword = sanitizedInput.slice(0, 6);

      if (password !== expectedPassword) {
        setPasswordError("Senha incorreta.");
        setLoading(false);
        return;
      }

      // Define a URL de acordo com o tipo de documento
      const searchParam = isCpf ? `cpf=${sanitizedInput}` : `cnpj=${sanitizedInput}`;

      // Busca os dados do usuário
      const response = await axios.get(
        `https://engpag.backend.gustavohenrique.dev/proxy/customers?${searchParam}&limit=100&offset=0`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        const userData = response.data.results[0];
        setUserData(userData);

        if (Platform.OS === "web") {
          localStorage.setItem("userData", JSON.stringify(userData));
        } else {
          await AsyncStorage.setItem("userData", JSON.stringify(userData));
        }

        router.replace("/initial-page");
      } else {
        setInputError("Cliente não encontrado.");
      }
    } catch (err) {
      Alert.alert("Erro", "Falha ao buscar dados do cliente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setModalVisible(true);
  };

  const handleSendPassword = async () => {
    if (!cpfRecovery) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }

    setLoadingRecovery(true);

    try {
      const credentials = btoa(
        "engenharq-mozart:i94B1q2HUXf7PP7oscuIBygquSRZ9lhb"
      );

      const sanitizedCpf = cpfRecovery.replace(/\D/g, '');

      if (!isValidCpf(sanitizedCpf)) {
        Alert.alert("Erro", "CPF inválido.");
        setLoadingRecovery(false);
        return;
      }

      const response = await axios.get(
        `https://engpag.backend.gustavohenrique.dev/proxy/customers?cpf=${sanitizedCpf}&limit=100&offset=0`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        const user = response.data.results[0];
        const cpfPassword = sanitizedCpf.slice(0, 6);

        const backendUrl =
          "https://engpag.backend.gustavohenrique.dev/send-password";

        await axios.post(backendUrl, {
          email: user.email,
          userName: user.name,
          password: cpfPassword,
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

        <View style={styles.inputContainer}>
          <Ionicons
            name="person"
            size={24}
            color="#E1272C"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="CPF ou CNPJ"
            value={inputValue}
            onChangeText={(text) => {
              const formatted = formatCpfCnpj(text);
              setInputValue(formatted);
              setInputError('');

              const sanitizedInput = formatted.replace(/\D/g, '');
              if (sanitizedInput.length === 11) {
                if (isValidCpf(sanitizedInput)) {
                  setInputError('');
                } else {
                  setInputError('CPF inválido');
                }
              } else if (sanitizedInput.length === 14) {
                if (isValidCnpj(sanitizedInput)) {
                  setInputError('');
                } else {
                  setInputError('CNPJ inválido');
                }
              } else {
                setInputError('CPF ou CNPJ incompleto');
              }
            }}
            keyboardType="numeric"
            placeholderTextColor="#aaa"
            returnKeyType="next"
            onSubmitEditing={() => {
              passwordInputRef.current.focus();
            }}
            accessible={true}
            accessibilityLabel="Digite seu CPF ou CNPJ"
          />
        </View>
        {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}

        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed"
            size={24}
            color="#E1272C"
            style={styles.icon}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Senha"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError('');
            }}
            secureTextEntry={!showPassword}
            placeholderTextColor="#aaa"
            ref={passwordInputRef}
            returnKeyType="done"
            onSubmitEditing={fetchUserData}
            accessible={true}
            accessibilityLabel="Digite sua senha"
          />
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
            accessible={true}
            accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={24}
              color="#E1272C"
            />
          </TouchableOpacity>
        </View>
        
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.accessButton}
          onPress={fetchUserData}
          accessible={true}
          accessibilityLabel="Acessar o aplicativo"
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#fff"
              style={styles.loading}
            />
          ) : (
            <Text style={styles.accessButtonText}>ACESSAR</Text>
          )}
        </TouchableOpacity>

        <Image source={require("./homelogo.png")} style={styles.logo} />
      </ScrollView>

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

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSendPassword}
              >
                {loadingRecovery ? (
                  <ActivityIndicator
                    size="large"
                    color="#fff"
                    style={styles.loading}
                  />
                ) : (
                  <Text style={styles.modalButtonText}>Enviar Senha</Text>
                )}
              </TouchableOpacity>

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
    marginBottom: 60,
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E1272C",
    marginBottom: 10,
    width: "100%",
  },
  icon: {
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 18,
    color: "#333",
  },
  forgotPasswordText: {
    color: "#E1272C",
    fontSize: 14,
    alignSelf: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  accessButton: {
    backgroundColor: "#E1272C",
    width: "60%",
    paddingVertical: 15,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
    marginTop: 40,
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
    marginBottom: 10,
    alignSelf: "flex-start",
    paddingLeft: 40,
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
    backgroundColor: "#E1272C",
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
  eyeIcon: {
    padding: 10,
  },
});

export default Index;
