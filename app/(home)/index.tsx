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
  Dimensions,
  Linking,
} from "react-native";
import axios from "axios";
import { Link, useRouter } from "expo-router";
import { UserContext } from "../contexts/UserContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LogoENG from "./engenharq.svg";
import LogoENGELOT from "./enegelot.svg";

const Index = () => {
  const [inputValue, setInputValue] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
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
    const numericValue = value.replace(/\D/g, "");
    if (numericValue.length <= 11) {
      let cpf = numericValue.replace(/(\d{3})(\d)/, "$1.$2");
      cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2");
      cpf = cpf.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      return cpf;
    } else {
      let cnpj = numericValue.replace(/^(\d{2})(\d)/, "$1.$2");
      cnpj = cnpj.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      cnpj = cnpj.replace(/\.(\d{3})(\d)/, ".$1/$2");
      cnpj = cnpj.replace(/(\d{4})(\d)/, "$1-$2");
      return cnpj;
    }
  };

  const isValidCpf = (cpf) => {
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;
    let sum = 0;
    let rest;
    for (let i = 1; i <= 9; i++)
      sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++)
      sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(10, 11))) return false;
    return true;
  };

  const isValidCnpj = (cnpj) => {
    cnpj = cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += numbers.charAt(length - i) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += numbers.charAt(length - i) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
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
      const sanitizedInput = inputValue.replace(/\D/g, "");
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

      const expectedPassword = sanitizedInput.slice(0, 6);
      if (password !== expectedPassword) {
        setPasswordError("Senha incorreta.");
        setLoading(false);
        return;
      }

      const searchParam = isCpf
        ? `cpf=${sanitizedInput}`
        : `cnpj=${sanitizedInput}`;
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

        if (rememberMe) {
          if (Platform.OS === "web") {
            localStorage.setItem("userData", JSON.stringify(userData));
          } else {
            await AsyncStorage.setItem("userData", JSON.stringify(userData));
          }
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
      const sanitizedCpf = cpfRecovery.replace(/\D/g, "");

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

        await axios.post(
          "https://engpag.backend.gustavohenrique.dev/send-password",
          {
            email: user.email,
            userName: user.name,
            password: cpfPassword,
          }
        );

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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topSection}>
        <View style={styles.whiteCurve}>
          <Image
            source={require("./engepag-logo.png")}
            style={styles.logoTop}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formCard}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={22} color="#D00000" />
            <TextInput
              style={styles.input}
              placeholder="Insira seu CPF ou CNPJ"
              value={inputValue}
              onChangeText={(text) => {
                const formatted = formatCpfCnpj(text);
                setInputValue(formatted);
                setInputError("");

                const sanitizedInput = formatted.replace(/\D/g, "");
                if (sanitizedInput.length === 11) {
                  if (isValidCpf(sanitizedInput)) {
                    setInputError("");
                  } else {
                    setInputError("CPF inválido");
                  }
                } else if (sanitizedInput.length === 14) {
                  if (isValidCnpj(sanitizedInput)) {
                    setInputError("");
                  } else {
                    setInputError("CNPJ inválido");
                  }
                } else {
                  setInputError("CPF ou CNPJ incompleto");
                }
              }}
              keyboardType="numeric"
              placeholderTextColor="#999"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
          </View>
          {inputError ? (
            <Text style={styles.errorText}>{inputError}</Text>
          ) : null}

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={22} color="#D00000" />
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              placeholder="Digite sua Senha"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError("");
              }}
              secureTextEntry={!showPassword}
              placeholderTextColor="#999"
              returnKeyType="done"
              onSubmitEditing={fetchUserData}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#999"
              />
            </TouchableOpacity>
          </View>
          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View
                style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
              >
                {rememberMe && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Lembre-me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPassword}>Esqueci a senha?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={fetchUserData}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>LOGIN</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomLogos}>
          <LogoENG
            width={150}
            height={40}
            style={{ transform: [{ translateY: 20 }] }} // Ajusta a posição vertical
          />

          <LogoENGELOT
            width={100}
            height={50}
            style={{ transform: [{ translateY: 20 }] }}
          />

          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={() => {
              const url = "https://wa.me/5582996343342";
              Linking.canOpenURL(url)
                .then((supported) => {
                  if (supported) {
                    return Linking.openURL(url);
                  } else {
                    Alert.alert("Erro", "WhatsApp não está instalado");
                  }
                })
                .catch((err) => console.error("Erro ao abrir WhatsApp:", err));
            }}
          >
            <Ionicons name="logo-whatsapp" size={32} color="white" />
            <Text style={styles.whatsappText}>Fale Conosco</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recuperar Senha</Text>

            <View style={styles.modalInputWrapper}>
              <Ionicons name="person-outline" size={22} color="#D00000" />
              <TextInput
                style={styles.modalInput}
                placeholder="CPF"
                value={cpfRecovery}
                onChangeText={setCpfRecovery}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSendPassword}
              disabled={loadingRecovery}
            >
              {loadingRecovery ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.modalButtonText}>Enviar Senha</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D00000",
  },
  topSection: {
    width: "100%",
    height: 280, // Increased for larger logo area
  },
  whiteCurve: {
    backgroundColor: "white",
    height: "100%",
    borderBottomLeftRadius: 1000,
    borderBottomRightRadius: 1000,
    transform: [{ scaleX: 1.5 }],
    alignItems: "center",
    paddingTop: 40,
    overflow: "hidden",
  },
  logoTop: {
    width: 300, // Larger logo size
    height: 200,
    transform: [{ scaleX: 0.667 }], // Compensate for parent scaleX
  },
  scrollView: {
    flex: 1,
  },
  formCard: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 30,
    padding: 20,
    paddingBottom: 60, // Aumentado para acomodar a curva
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginBottom: 15,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
    padding: 0,
  },
  errorText: {
    color: "#D00000",
    fontSize: 12,
    marginBottom: 5,
    marginLeft: 10,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#999",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#D00000",
    borderColor: "#D00000",
  },
  checkboxLabel: {
    color: "#666",
    fontSize: 14,
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25D366", // Cor oficial do WhatsApp
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  whatsappText: {
    color: "white",
    marginLeft: 8,
    fontWeight: "bold",
  },
  forgotPassword: {
    color: "#666",
    fontSize: 14,
    fontStyle: "italic",
  },
  loginButton: {
    position: "absolute",
    bottom: -25,
    left: 20,
    right: 20,
    backgroundColor: "#FF0000",
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5.84,
    zIndex: 1,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1, // Added for better text spacing
  },
  bottomLogos: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
    gap: 30,
    overflow: 'hidden'
  },
  logoContainer: {
    width: 300,
    height: 60, // Reduzido para remover o espaço extra
    overflow: "hidden", // Isso vai cortar qualquer espaço extra
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    width: "90%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#D00000",
    textAlign: "center",
    marginBottom: 20,
  },
  modalInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
    padding: 0,
  },
  modalButton: {
    backgroundColor: "#D00000",
    borderRadius: 25,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalCancelButton: {
    marginTop: 15,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#666",
    fontSize: 16,
  },
});

export default Index;
