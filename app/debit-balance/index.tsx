import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import * as Linking from "expo-linking";

export default function DebitBalanceScreen() {
  const { userData } = useContext(UserContext);
  const [installmentsData, setInstallmentsData] = useState<any[]>([]);
  const [filteredInstallments, setFilteredInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedBillReceivableId, setSelectedBillReceivableId] =
    useState<any>(null);
  const [selectedOption, setSelectedOption] = useState("pendentes");
  const [sortAsc, setSortAsc] = useState(true);
  const [totals, setTotals] = useState({
    originalTotal: 0,
    correctedTotal: 0,
    additionalTotal: 0,
    updatedTotal: 0,
  });
  const router = useRouter();

const formatCurrency = (value) => {
  if (isNaN(value)) {
    return "R$ 0,00"; // Retorna "R$ 0,00" se o valor for inválido
  }

  return `R$ ${parseFloat(value)
    .toFixed(3) // Garante que haverá sempre duas casas decimais
    .replace('.', ',') // Substitui o ponto por vírgula para as casas decimais
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`; // Adiciona pontos para separar milhares
};


  useEffect(() => {
    if (userData && userData.cpf) {
      fetchInstallments();
    }
  }, [userData]);

  useEffect(() => {
    applyFilters();
  }, [
    searchText,
    selectedOption,
    sortAsc,
    installmentsData,
    selectedBillReceivableId,
  ]);

  const fetchInstallments = async () => {
    setLoading(true);
    setError("");

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

      setInstallmentsData(response.data.results || []);

      if (response.data.results.length > 0) {
        setSelectedBillReceivableId(response.data.results[0].billReceivableId);
      }
    } catch (err) {
      setError("Falha ao buscar saldo devedor.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered: any[] = [];
    let originalTotal = 0;
    let correctedTotal = 0;
    let additionalTotal = 0;
    let updatedTotal = 0;

    const selectedResult = installmentsData.find(
      (result) => result.billReceivableId === selectedBillReceivableId
    );

    if (selectedResult) {
      let installments = [];
      if (selectedOption === "pagos") {
        installments = selectedResult.paidInstallments || [];
      } else if (selectedOption === "pendentes") {
        installments = [
          ...(selectedResult.dueInstallments?.filter(
            (installment: any) => new Date(installment.dueDate) >= new Date()
          ) || []),
          ...(selectedResult.payableInstallments || []),
        ];
      } else if (selectedOption === "vencidos") {
        installments =
          selectedResult.dueInstallments?.filter(
            (installment: any) => new Date(installment.dueDate) < new Date()
          ) || [];
      }

      if (installments.length > 0) {
        filtered = installments;
        installments.forEach((installment: any) => {
          originalTotal += installment.originalValue || 0;
          correctedTotal += installment.monetaryCorrectionValue || 0;
          additionalTotal += installment.additionalValue || 0;
          updatedTotal += installment.currentBalance || 0;
        });
      }
    }

    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      return sortAsc
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });

    if (searchText) {
      filtered = filtered.filter((installment) =>
        installment.installmentNumber.includes(searchText)
      );
    }

    setFilteredInstallments(filtered);

    setTotals({
      originalTotal,
      correctedTotal,
      additionalTotal,
      updatedTotal,
    });
  };

  const handleBoletoNavigation = (installmentId: number) => {
    const selectedResult = installmentsData.find(
      (result) =>
        result.paidInstallments?.some(
          (installment) => installment.installmentId === installmentId
        ) ||
        result.dueInstallments?.some(
          (installment) => installment.installmentId === installmentId
        )
    );

    if (selectedResult) {
      const installment =
        selectedResult.paidInstallments?.find(
          (item) => item.installmentId === installmentId
        ) ||
        selectedResult.dueInstallments?.find(
          (item) => item.installmentId === installmentId
        );

      if (installment) {
        router.push({
          pathname: "/boleto",
          params: {
            billReceivableId: selectedResult.billReceivableId,
            installmentId: installment.installmentId,
          },
        });
      } else {
        Alert.alert("Erro", "Parcela não encontrada.");
      }
    } else {
      Alert.alert("Erro", "Boleto não encontrado.");
    }
  };

  const handleDownloadPDF = async () => {
    setLoading(true);
    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);

      const response = await axios.get(
        `https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance/pdf`,
        {
          params: {
            customerId: userData.id,
          },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      const pdfUrl = response.data.results?.[0]?.urlReport;

      if (pdfUrl) {
        Linking.openURL(pdfUrl);
      } else {
        Alert.alert("Erro", "Não foi possível gerar o PDF.");
      }
    } catch (err) {
      Alert.alert("Erro", "Falha ao gerar o PDF.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderInstallment = ({ item }: any) => {
    const isOverdue = new Date(item.dueDate) < new Date();

    return (
      <View
        style={[styles.installment, isOverdue && styles.overdueInstallment]}
      >
        <View style={styles.row}>
          <Ionicons name="receipt-outline" size={16} color="black" />
          <Text style={styles.installmentNumber}>
            Parcela: {item.installmentNumber} (Título:{" "}
            {selectedBillReceivableId})
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={16} color="black" />
          <Text style={styles.installmentText}>Vencimento: {item.dueDate}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="wallet-outline" size={16} color="black" />
          <Text style={styles.installmentText}>
            Saldo Atual: {formatCurrency(item.currentBalance)}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="cash-outline" size={16} color="black" />
          <Text style={styles.installmentText}>
            Valor Original: {formatCurrency(item.originalValue)}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="trending-up-outline" size={16} color="black" />
          <Text style={styles.installmentText}>
            Correção Monetária: {formatCurrency(item.monetaryCorrectionValue)}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="document-outline" size={16} color="black" />
          <Text style={styles.installmentText}>
            Boleto Gerado: {item.generatedBoleto ? "Sim" : "Não"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.generateBoletoButton}
          onPress={() => handleBoletoNavigation(item.installmentId)}
        >
          <Ionicons name="eye-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Ver Boleto</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" color="#007bff" />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.summarySection}>
        <Text style={styles.summaryText}>
          <Ionicons name="cash-outline" size={16} color="black" /> Valor Total
          Original: {formatCurrency(totals.originalTotal)}
        </Text>
        <Text style={styles.summaryText}>
          <Ionicons name="trending-up-outline" size={16} color="black" />{" "}
          Correção Monetária: {formatCurrency(totals.correctedTotal)}
        </Text>
        <Text style={styles.summaryText}>
          <Ionicons name="add-circle-outline" size={16} color="black" />{" "}
          Acréscimos: {formatCurrency(totals.additionalTotal)}
        </Text>
        <Text style={styles.summaryText}>
          <Ionicons name="calculator-outline" size={16} color="black" /> Valor
          Atualizado: {formatCurrency(totals.updatedTotal)}
        </Text>
      </View>

      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por número de parcela"
          value={searchText}
          onChangeText={setSearchText}
        />

        <Picker
          selectedValue={selectedBillReceivableId}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedBillReceivableId(itemValue)}
        >
          {installmentsData.map((item) => (
            <Picker.Item
              key={item.billReceivableId}
              label={`Título: ${item.billReceivableId}`}
              value={item.billReceivableId}
            />
          ))}
        </Picker>

        <Picker
          selectedValue={selectedOption}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedOption(itemValue)}
        >
          <Picker.Item label="Boletos Pendentes / A vencer" value="pendentes" />
          <Picker.Item label="Boletos Pagos" value="pagos" />
          <Picker.Item label="Boletos Vencidos" value="vencidos" />
        </Picker>
      </View>

      {filteredInstallments.length > 0 ? (
        <FlatList
          data={filteredInstallments}
          keyExtractor={(item) => `${item.installmentId}-${item.dueDate}`}
          renderItem={renderInstallment}
        />
      ) : (
        <Text style={styles.noInstallmentsText}>
          Nenhuma parcela encontrada
        </Text>
      )}
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={handleDownloadPDF}
      >
        <Ionicons name="download-outline" size={20} color="white" />
        <Text style={styles.buttonText}>Baixar PDF do Saldo Devedor</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9f9f9",
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  searchSection: {
    marginBottom: 20,
  },
  searchInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  picker: {
    height: 40,
    marginVertical: 10,
  },
  errorText: {
    color: "red",
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  installment: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  overdueInstallment: {
    borderColor: "red",
    borderWidth: 2,
  },
  installmentNumber: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  installmentText: {
    fontSize: 14,
    color: "#555",
    marginLeft: 8,
  },
  generateBoletoButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 5,
  },
  noInstallmentsText: {
    fontSize: 16,
    color: "#333",
    marginTop: 20,
    textAlign: "center",
  },
  downloadButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
});
