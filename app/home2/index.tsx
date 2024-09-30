import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons'; // Ícones do Expo

const Home2Screen = () => {
  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <FontAwesome name="bars" size={24} color="#fff" />
        <Text style={styles.headerTitle}>ENG PAG</Text>
        <FontAwesome name="bell" size={24} color="#fff" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Saudação */}
        <Text style={styles.greeting}>Olá, Mozart!</Text>
        <View style={styles.greetingDivider} />

        {/* Seção de Empreendimentos */}
        <Text style={styles.sectionTitle}>Empreendimentos</Text>

        {/* Cards de Empreendimentos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>RESIDENCIAL GRAND RESERVA</Text>
          <View style={styles.cardInfo}>
            <View style={styles.infoItem}>
              <FontAwesome name="building" size={24} color="#7B3AF5" />
              <Text style={styles.infoText}>BL4</Text>
            </View>
            <View style={styles.infoItem}>
              <FontAwesome name="home" size={24} color="#7B3AF5" />
              <Text style={styles.infoText}>APT 25</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>RESIDENCIAL LUAR FRANCÊS</Text>
          <View style={styles.cardInfo}>
            <View style={styles.infoItem}>
              <FontAwesome name="home" size={24} color="#7B3AF5" />
              <Text style={styles.infoText}>Nº 125</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>RESIDENCIAL GRAND RESERVA</Text>
          <View style={styles.cardInfo}>
            <View style={styles.infoItem}>
              <FontAwesome name="building" size={24} color="#7B3AF5" />
              <Text style={styles.infoText}>BL4</Text>
            </View>
            <View style={styles.infoItem}>
              <FontAwesome name="home" size={24} color="#7B3AF5" />
              <Text style={styles.infoText}>APT 25</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7B3AF5',
    marginTop: 20,
    textAlign: 'center',
  },
  greetingDivider: {
    height: 2,
    backgroundColor: '#7B3AF5',
    marginVertical: 10,
    alignSelf: 'center',
    width: '60%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 3, // Sombras no Android
    shadowColor: '#000', // Sombras no iOS
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
});

export default Home2Screen;
