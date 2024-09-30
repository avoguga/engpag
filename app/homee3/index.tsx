import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons'; // Ícones do Expo

const Home3Screen = () => {
  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <FontAwesome name="bars" size={24} color="#fff" />
        <Text style={styles.headerTitle}>ENG PAG</Text>
        <FontAwesome name="bell" size={24} color="#fff" />
      </View>

      {/* Conteúdo */}
      <View style={styles.content}>
        {/* Ícone e Título do Residencial */}
        <View style={styles.residentialInfo}>
          <View style={styles.iconCircle}>
            <FontAwesome name="home" size={30} color="#fff" />
          </View>
          <Text style={styles.residentialTitle}>RESIDENCIAL GRAND RESERVA</Text>
        </View>

        {/* Botões de Ação */}
        <TouchableOpacity style={styles.actionButtonLarge}>
          <Text style={styles.actionButtonText}>2ª VIA BOLETO</Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButtonSmall}>
            <Text style={styles.actionButtonText}>ANTECIPAR PARCELAS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSmall}>
            <Text style={styles.actionButtonText}>SALDO DEVEDOR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButtonSmall}>
            <Text style={styles.actionButtonText}>PAGAMENTOS REALIZADOS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSmall}>
            <Text style={styles.actionButtonText}>INDIQUE UM AMIGO</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6EAF8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#7B3AF5',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  residentialInfo: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    backgroundColor: '#7B3AF5',
    borderRadius: 50,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  residentialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  actionButtonLarge: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  actionButtonSmall: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '48%', // 48% para ajustar dois botões por linha com espaço entre eles
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
});

export default Home3Screen;
