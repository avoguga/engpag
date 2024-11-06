import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Linking,
} from 'react-native';
import axios from 'axios';
import { UserContext } from '../contexts/UserContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const PaymentHistory = () => {
  const { userData } = useContext(UserContext);
  const { billReceivableId, enterpriseName } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [installments, setInstallments] = useState([]);
  const [completedPayments, setCompletedPayments] = useState([]);
  const [filter, setFilter] = useState('A VENCER');

  useEffect(() => {
    fetchInstallments();
    fetchCompletedPayments();
  }, [userData, billReceivableId]);

  const fetchInstallments = async () => {
    if (!userData || !userData.cpf || !billReceivableId) {
      Alert.alert('Erro', 'Dados do cliente ou ID do título não encontrados.');
      return;
    }

    setLoading(true);
    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb';
      const credentials = btoa(`${username}:${password}`);

      const response = await axios.get(
        'https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance',
        {
          params: { cpf: userData.cpf, correctAnnualInstallment: 'N' },
          headers: { Authorization: `Basic ${credentials}` },
        }
      );

      const results = response.data.results || [];
      const selectedResult = results.find(
        (result) => result.billReceivableId == billReceivableId
      );

      if (!selectedResult) {
        Alert.alert('Erro', 'Título não encontrado.');
        setLoading(false);
        return;
      }

      const allInstallments = [
        ...(selectedResult.dueInstallments || []),
        ...(selectedResult.payableInstallments || []),
      ].map((installment) => ({
        ...installment,
        billReceivableId: selectedResult.billReceivableId,
        currentBalance: parseFloat(installment.currentBalance || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
        conditionType: installment.conditionType,
      }));

      setInstallments(allInstallments);
    } catch (error) {
      console.error('Erro ao buscar detalhes das parcelas:', error);
      Alert.alert('Erro', 'Não foi possível obter os detalhes das parcelas.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedPayments = async () => {
    if (!userData || !userData.cpf || !billReceivableId) {
      Alert.alert('Erro', 'Dados do cliente ou ID do título não encontrados.');
      return;
    }

    setLoading(true);
    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb';
      const credentials = btoa(`${username}:${password}`);

      const response = await axios.get(
        'https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance',
        {
          params: { cpf: userData.cpf, correctAnnualInstallment: 'N' },
          headers: { Authorization: `Basic ${credentials}` },
        }
      );

      const results = response.data.results || [];
      const selectedResult = results.find(
        (result) => result.billReceivableId == billReceivableId
      );

      if (!selectedResult) {
        Alert.alert('Erro', 'Título não encontrado.');
        setLoading(false);
        return;
      }

      const { paidInstallments } = selectedResult;

      if (!paidInstallments || paidInstallments.length === 0) {
        setCompletedPayments([]);
        setLoading(false);
        return;
      }

      const payments = paidInstallments.map((installment) => {
        let paymentDate = null;
        let formattedPaymentDate = "Data indisponível";

        if (
          installment.receipts &&
          installment.receipts.length > 0 &&
          installment.receipts[0].receiptDate
        ) {
          paymentDate = new Date(installment.receipts[0].receiptDate);
          formattedPaymentDate = paymentDate.toLocaleDateString("pt-BR");
        }

        const value = installment.originalValue
          ? parseFloat(installment.originalValue).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          : "Valor indisponível";

        return {
          id: installment.installmentId.toString(),
          number: installment.installmentNumber,
          billReceivableId: selectedResult.billReceivableId,
          dueDate: new Date(installment.dueDate),
          formattedDueDate: new Date(installment.dueDate).toLocaleDateString("pt-BR"),
          paymentDate: paymentDate,
          formattedPaymentDate: formattedPaymentDate,
          value: value,
          conditionType: installment.conditionType,
        };
      });

      setCompletedPayments(payments);
    } catch (error) {
      console.error("Erro ao buscar parcelas pagas:", error);
      Alert.alert("Erro", "Não foi possível obter as parcelas pagas.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentHistoryNavigation = async () => {
    if (!userData || !userData.id) {
      Alert.alert("Erro", "Dados do cliente não disponíveis.");
      return;
    }

    setLoadingHistory(true);

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

      if (response.data && response.data.results && response.data.results[0]) {
        const url = response.data.results[0].urlReport;
        Linking.openURL(url);
      } else {
        Alert.alert("Erro", "Histórico de pagamentos não disponível.");
      }
    } catch (error) {
      console.error("Erro ao buscar histórico de pagamentos:", error);
      Alert.alert("Erro", "Não foi possível obter o histórico de pagamentos.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const getFilteredInstallments = () => {
    const today = new Date();

    if (filter === 'PAGOS') {
      return completedPayments;
    }

    return installments.filter((installment) => {
      const dueDate = new Date(installment.dueDate);
      if (filter === 'VENCIDOS') return dueDate < today && !installment.paidDate;
      if (filter === 'A VENCER') return dueDate >= today && !installment.paidDate;
    });
  };

  const renderInstallmentItem = ({ item }) => (
    <View style={[styles.card, item.paymentDate ? styles.paidBorder : item.dueDate < new Date() ? styles.overdueBorder : styles.dueBorder]}>
      <MaterialIcons name="attach-money" size={30} color={item.paymentDate ? "#2E7D32" : "#E1272C"} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>
          <Text style={styles.label}>Vencimento: </Text>{formatDate(item.dueDate)}
        </Text>
        <Text style={styles.cardConditionType}>
          <Text style={styles.label}>Condição: </Text>{item.conditionType}
        </Text>
        <Text style={styles.cardAmount}>
          <Text style={styles.label}>Valor: </Text>{item.value || item.currentBalance}
        </Text>
        {item.paymentDate && (
          <Text style={styles.cardPaidDate}>
            <Text style={styles.label}>Pago em: </Text>{item.formattedPaymentDate}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.enterpriseName}>{enterpriseName}</Text>

      <Text style={styles.sectionTitle}>Extrato de Pagamentos</Text>

      <TouchableOpacity style={styles.downloadButton} onPress={handlePaymentHistoryNavigation} disabled={loadingHistory}>
        <View style={styles.downloadButtonContent}>
          <MaterialIcons name="download" size={20} color="#fff" />
          <Text style={styles.downloadButtonText}>
            {loadingHistory ? 'Baixando...' : 'Baixar Histórico Completo'}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.filterContainer}>
        <TouchableOpacity onPress={() => setFilter('VENCIDOS')}>
          <Text style={[styles.filterText, filter === 'VENCIDOS' && styles.activeFilter]}>Vencidos</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('A VENCER')}>
          <Text style={[styles.filterText, filter === 'A VENCER' && styles.activeFilter]}>A Vencer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('PAGOS')}>
          <Text style={[styles.filterText, filter === 'PAGOS' && styles.activeFilter]}>Pagos</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#E1272C" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={getFilteredInstallments()}
          keyExtractor={(item, index) => `${item.installmentId}-${index}`}
          renderItem={renderInstallmentItem}
          contentContainerStyle={styles.scrollContainer}
          ListEmptyComponent={
            <Text style={styles.noInstallmentsText}>
              Nenhum registro encontrado para a categoria "{filter}".
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F6',
    padding: 16,
  },
  enterpriseName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#E1272C',
    marginVertical: 10,
  },
  downloadButton: {
    backgroundColor: '#E1272C',
    paddingVertical: 10,
    borderRadius: 5,
    marginVertical: 10,
    alignItems: 'center',
    width: '80%',
    alignSelf: 'center',
  },
  downloadButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  filterText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
  },
  activeFilter: {
    color: '#E1272C',
    borderBottomWidth: 2,
    borderBottomColor: '#E1272C',
  },
  scrollContainer: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 3,
  },
  dueBorder: {
    borderLeftColor: '#E1272C',
    borderLeftWidth: 5,
  },
  paidBorder: {
    borderLeftColor: '#2E7D32',
    borderLeftWidth: 5,
  },
  overdueBorder: {
    borderLeftColor: '#FFA726',
    borderLeftWidth: 5,
  },
  cardContent: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardAmount: {
    fontSize: 16,
    color: '#E1272C',
    marginTop: 5,
  },
  cardDueDate: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },
  cardConditionType: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
    fontStyle: 'italic',
  },
  cardPaidDate: {
    fontSize: 14,
    color: '#2E7D32',
    marginTop: 5,
  },
  label: {
    fontWeight: '600',
  },
  noInstallmentsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginTop: 20,
  },
});

export default PaymentHistory;
