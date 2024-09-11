import React, { useState, useContext, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet, FlatList, Linking, Alert } from 'react-native';
import axios from 'axios';
import { Buffer } from 'buffer';
import { UserContext } from './contexts/UserContext';

export default function DebitBalanceScreen() {
  const { userData } = useContext(UserContext); // Access the user data including CPF and customerId
  const [debitBalance, setDebitBalance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    if (userData && userData.cpf) {
      fetchDebitBalance(); // Automatically fetch debit balance when CPF is available
    }
  }, [userData]);

  const fetchDebitBalance = async () => {
    setLoading(true);
    setError('');
    setPdfUrl(''); // Reset PDF URL

    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb';
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');

      const response = await axios.get(
        `https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance`,
        {
          params: {
            cpf: userData.cpf, // Use the CPF from the context
            correctAnnualInstallment: 'N',
          },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );
      setDebitBalance(response.data.results);
    } catch (err) {
      setError('Falha ao buscar saldo devedor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDebitBalancePdf = async () => {
    
    if (!userData || !userData.id) {
      setError('ID do cliente não encontrado.');
      return;
    }

    setLoading(true);
    setError('');
    setPdfUrl('');

    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb';
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');

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

      // Accessing the urlReport inside the results array
      if (response.data.results && response.data.results[0].urlReport) {
        setPdfUrl(response.data.results[0].urlReport);
      } else {
        Alert.alert('Erro', 'URL do PDF não encontrada');
      }
    } catch (err) {
      setError('Falha ao gerar PDF.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderInstallment = ({ item }: any) => (
    <View style={styles.installment}>
      <Text style={styles.installmentText}>Número da Parcela: {item.installmentNumber}</Text>
      <Text style={styles.installmentText}>Data de Vencimento: {item.dueDate}</Text>
      <Text style={styles.installmentText}>Saldo Atual: {item.currentBalance}</Text>
      <Text style={styles.installmentText}>Tipo de Condição: {item.conditionType}</Text>
      <Text style={styles.installmentText}>Boleto Gerado: {item.generatedBoleto ? 'Sim' : 'Não'}</Text>
      <Text style={styles.installmentText}>Valor Ajustado: {item.adjustedValue}</Text>
      <Text style={styles.installmentText}>Valor Original: {item.originalValue}</Text>
      <Text style={styles.installmentText}>Correção Monetária: {item.monetaryCorrectionValue}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {debitBalance && (
        <FlatList
          data={debitBalance.length > 0 && debitBalance[0].dueInstallments ? debitBalance[0].dueInstallments : []}
          keyExtractor={(item) => item.installmentId.toString()}
          renderItem={renderInstallment}
        />
      )}

      {pdfUrl ? (
        <View>
          <Button title="Baixar PDF" onPress={() => Linking.openURL(pdfUrl)} />
        </View>
      ) : (
        <Button title="Gerar PDF" onPress={fetchDebitBalancePdf} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginTop: 20,
  },
  installment: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 5,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  installmentText: {
    fontSize: 16,
    marginBottom: 5,
  },
});
