import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, ActivityIndicator, StyleSheet } from 'react-native';
import axios from 'axios';
import { Buffer } from 'buffer';
import { useRouter } from 'expo-router';
import { UserContext } from '../contexts/UserContext';

const Index = () => {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  
  // Access setUserData from the context
  const { setUserData, userData } = useContext(UserContext);

  const fetchUserData = async () => {
    if (!cpf) {

      setError('Please enter a valid CPF.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const username = 'engenharq-mozart';
      const password = 'i94B1q2HUXf7PP7oscuIBygquSRZ9lhb';
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');

      const response = await axios.get(
        `https://api.sienge.com.br/engenharq/public/api/v1/customers?cpf=${cpf}&limit=100&offset=0`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );
      setUserData(response.data.results[0]);  // Store user data in context
    } catch (err) {
      setError('Failed to fetch user data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Enter CPF:</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter CPF"
        value={cpf}
        onChangeText={setCpf}
        keyboardType="numeric"
      />
      <Button title="Fetch User Data" onPress={fetchUserData} />

      {loading && <ActivityIndicator size="large" color="#0000ff" />}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {userData && (
        <View>
          <Text>User Data Fetched!</Text>
          <Button
            title="Current Debit Balance"
            onPress={() => router.push('/DebitBalanceScreen')}  // Route without passing params
          />
          <Button title="Boleto Screen" onPress={() => router.push('/BoletoScreen')} />
          <Button title="Pix Payment Screen" onPress={() => router.push('/PixPaymentScreen')} />
          <Button title="Parcel Anticipation" onPress={() => router.push('/ParcelAnticipationScreen')} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 8,
  },
  errorText: {
    color: 'red',
    marginTop: 20,
  },
});

export default Index;
