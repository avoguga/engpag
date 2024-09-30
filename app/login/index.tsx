import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons'; // Importando ícones do Expo

const LoginScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {/* Ajustar o caminho da logo conforme necessário */}
        <Image source={require('./aaaa.png')} style={styles.logo} />
      </View>

      <View style={styles.inputsSection}>
        <View style={styles.inputContainer}>
          <FontAwesome name="user" size={24} color="#7B3AF5" style={styles.icon} />
          <TextInput 
            placeholder="CPF" 
            placeholderTextColor="#7B3AF5" // Cor do placeholder
            style={styles.input} 
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={24} color="#7B3AF5" style={styles.icon} />
          <TextInput 
            placeholder="Senha" 
            placeholderTextColor="#7B3AF5" // Cor do placeholder
            style={styles.input} 
            secureTextEntry 
          />
        </View>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>ACESSAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6EAF8', // Ajustar para a cor de fundo correta
    justifyContent: 'space-around', // Ajusta o espaçamento entre os elementos
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200, // Ajuste o tamanho conforme necessário
    height: 200, // Ajuste o tamanho conforme necessário
    resizeMode: 'contain',
  },
  inputsSection: {
    flex: 2,
    width: '100%',
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#7B3AF5',
    marginBottom: 30,
    width: '100%', // Ajustar o campo de texto ao tamanho da tela
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#333',
    paddingVertical: 10,
  },
  buttonSection: {
    flex: 1,
    width: '100%',
  },
  button: {
    backgroundColor: '#4B4B4B',
    padding: 15,
    alignItems: 'center',
    borderRadius: 5,
    width: '100%', // Botão de login deve ocupar a largura máxima da tela
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
