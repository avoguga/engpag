import React, { useContext, useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { UserContext } from '../contexts/UserContext';
import { useLocalSearchParams } from 'expo-router';

const BoletoScreen = () => {
  const { userData } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [boletoLink, setBoletoLink] = useState('');
  const [digitableNumber, setDigitableNumber] = useState('');

  // Capturando os parâmetros da navegação
  const { billReceivableId, installmentId } = useLocalSearchParams();

  console.log(billReceivableId, installmentId);

  // Verifica se os parâmetros foram fornecidos
  useEffect(() => {
    if (!billReceivableId || !installmentId) {
      Alert.alert('Erro', 'ID da parcela ou do boleto não fornecido.');
    }
  }, [billReceivableId, installmentId]);

  const requestBoletoEmail = async () => {
    if (!userData) {
      Alert.alert('Erro', 'Dados do cliente não encontrados.');
      return;
    }

    // Verifica se os parâmetros estão disponíveis
    if (!billReceivableId || !installmentId) {
      Alert.alert('Erro', 'ID da parcela ou do boleto não fornecido.');
      return;
    }

    setLoading(true);

    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb';
      const credentials = btoa(`${username}:${password}`); // Usando btoa para codificação Base64

      const response = await axios.post(
        'https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification',
        {
          receivableBillId: billReceivableId,
          installmentId: installmentId,
          emailCustomer: userData.email,
          emailTitle: 'Segunda via de boleto',
          emailBody: 'Prezado cliente, segue a segunda via do boleto conforme solicitado.',
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 201) {
        Alert.alert('Sucesso', 'Boleto enviado com sucesso para o email: ' + userData.email);
      } else {
        Alert.alert('Erro', 'Falha ao enviar o boleto.');
      }
    } catch (error) {
      console.error('Error fetching boleto:', error);
      Alert.alert('Erro', 'Erro ao gerar o boleto.');
    } finally {
      setLoading(false);
    }
  };

  const requestBoletoLink = async () => {
    if (!userData) {
      Alert.alert('Erro', 'Dados do cliente não encontrados.');
      return;
    }

    // Verifica se os parâmetros estão disponíveis
    if (!billReceivableId || !installmentId) {
      Alert.alert('Erro', 'ID da parcela ou do boleto não fornecido.');
      return;
    }

    setLoading(true);

    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb';
      const credentials = btoa(`${username}:${password}`); // Usando btoa para codificação Base64

      const response = await axios.get(
        'https://api.sienge.com.br/engenharq/public/api/v1/payment-slip-notification',
        {
          params: {
            billReceivableId: billReceivableId,
            installmentId: installmentId,
          },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.data.results && response.data.results[0]) {
        setBoletoLink(response.data.results[0].urlReport);
        setDigitableNumber(response.data.results[0].digitableNumber);
      } else {
        Alert.alert('Erro', 'Falha ao gerar o link do boleto.');
      }
    } catch (error) {
      console.error('Erro ao gerar link do boleto:', error);
      Alert.alert('Erro', 'Erro ao gerar o link do boleto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Segunda via de boleto</Text>
      <Text style={styles.infoText}>Enviar boleto para o e-mail: {userData?.email}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={requestBoletoEmail}>
            <Text style={styles.buttonText}>Enviar Boleto por Email</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={requestBoletoLink}>
            <Text style={styles.buttonText}>Gerar Link da Segunda Via</Text>
          </TouchableOpacity>

          {boletoLink ? (
            <View style={styles.boletoContainer}>
              <Text style={styles.digitableNumberText}>Número Digitável: {digitableNumber}</Text>
              <TouchableOpacity style={styles.boletoButton} onPress={() => Linking.openURL(boletoLink)}>
                <Text style={styles.boletoButtonText}>Abrir Boleto</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 15,
    width: '90%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boletoContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  digitableNumberText: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#444',
  },
  boletoButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  boletoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BoletoScreen;
