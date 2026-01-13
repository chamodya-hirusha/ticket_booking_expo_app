import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const InvalidTicket = () => {
    const { colors, theme } = useTheme();
    const navigation = useNavigation();

    const handleClose = () => {
        navigation.goBack();
    };

    const handleScanAgain = () => {
        // Navigate back to scan or handle scan action
        navigation.goBack();
    };

    const handleHelp = () => {
        // Navigate to support
        navigation.navigate('Support' as never);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Scan Result</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                {/* Glowing Icon */}
                <View style={styles.iconContainer}>
                    <View style={[styles.glowRing, { borderColor: colors.notification, shadowColor: colors.notification }]} />
                    <View style={[styles.iconCircle, { backgroundColor: '#2a0a1a' }]}>
                        <Ionicons name="close-circle" size={64} color={colors.notification} />
                    </View>
                </View>

                {/* Result Card */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.text }]}>INVALID TICKET</Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        This ticket was not found in our system. Please try scanning again or contact support.
                    </Text>

                    <TouchableOpacity onPress={handleScanAgain} activeOpacity={0.8}>
                        <LinearGradient
                            colors={[colors.notification, '#ff4444']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.scanButton}
                        >
                            <Text style={styles.scanButtonText}>SCAN AGAIN</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleHelp} style={styles.helpButton}>
                        <Text style={[styles.helpText, { color: colors.primary }]}>Need Help?</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    closeButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    placeholder: {
        width: 34,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        width: 120,
        height: 120,
    },
    glowRing: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        opacity: 0.5,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        // Inner shadow effect can be simulated or added if needed
    },
    card: {
        width: '100%',
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        letterSpacing: 1,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    scanButton: {
        width: '100%',
        paddingVertical: 15,
        paddingHorizontal: 60,
        borderRadius: 25,
        alignItems: 'center',
        marginBottom: 20,
    },
    scanButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    helpButton: {
        padding: 10,
    },
    helpText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default InvalidTicket;
