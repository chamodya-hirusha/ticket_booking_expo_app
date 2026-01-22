import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Event } from '../constants';
import { formatPrice } from '../utils/event';
import { apiService } from '../services/api';

const { width } = Dimensions.get('window');

type TicketSelectionRouteProp = RouteProp<{ TicketSelection: { event: Event } }, 'TicketSelection'>;

interface TicketType {
    id: string;
    name: string;
    price: number;
    features: string[];
    color: string;
    icon: string;
}

// Base ticket type structure (prices will be loaded from event)
const BASE_TICKET_TYPES: Omit<TicketType, 'price'>[] = [
    {
        id: 'VIP',
        name: 'VIP',
        features: ['Front Row Access', 'Meet & Greet', 'Exclusive Merchandise', 'VIP Lounge Access'],
        color: '#FFD700',
        icon: 'star'
    },
    {
        id: 'PREMIUM',
        name: 'Premium',
        features: ['Premium Seating', 'Fast Track Entry', 'Complimentary Drink', 'Reserved Parking'],
        color: '#C0C0C0',
        icon: 'award'
    },
    {
        id: 'GENERAL',
        name: 'General',
        features: ['General Admission', 'Standard Seating', 'Event Access'],
        color: '#CD7F32',
        icon: 'tag'
    }
];

const TicketSelection = () => {
    const { colors, theme } = useTheme();
    const navigation = useNavigation();
    const route = useRoute<TicketSelectionRouteProp>();
    const { event } = route.params;

    const [availableTypes, setAvailableTypes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch available ticket types from API
    React.useEffect(() => {
        const fetchTicketTypes = async () => {
            try {
                const response = await apiService.reservation.getTicketTypes();
                if (response.success && response.data) {
                    setAvailableTypes(response.data);
                } else {
                    // Fallback to defaults if API fails
                    setAvailableTypes(['VIP', 'PREMIUM', 'GENERAL']);
                }
            } catch (error) {
                console.error('Error fetching ticket types:', error);
                setAvailableTypes(['VIP', 'PREMIUM', 'GENERAL']);
            } finally {
                setLoading(false);
            }
        };

        fetchTicketTypes();
    }, []);

    // Load ticket types with actual prices from event
    const getTicketTypes = (): TicketType[] => {
        // Source of truth: event.ticketTypes from backend
        if (event.ticketTypes && event.ticketTypes.length > 0) {
            return event.ticketTypes.map(tt => {
                const nameUpper = tt.name.toUpperCase();
                const base = BASE_TICKET_TYPES.find(b => b.id === nameUpper) || {
                    id: nameUpper,
                    name: tt.name,
                    features: ['Event Access'],
                    color: '#94a3b8',
                    icon: 'tag'
                };

                return {
                    ...base,
                    price: tt.price
                };
            });
        }

        // Fallback to old logic if ticketTypes is not present
        return BASE_TICKET_TYPES
            .filter(base => availableTypes.includes(base.id))
            .map(baseTicket => {
                let price = 0;

                switch (baseTicket.id) {
                    case 'VIP':
                        price = event?.vipTicketPrice || 0;
                        break;
                    case 'PREMIUM':
                        price = event?.premiumTicketPrice || 0;
                        break;
                    case 'GENERAL':
                        price = event?.generalTicketPrice || 0;
                        break;
                }

                // Fallback to default prices if event prices are 0 or missing
                if (price === 0) {
                    switch (baseTicket.id) {
                        case 'VIP':
                            price = 299;
                            break;
                        case 'PREMIUM':
                            price = 149;
                            break;
                        case 'GENERAL':
                            price = 79;
                            break;
                    }
                }

                return {
                    ...baseTicket,
                    price
                };
            });
    };

    const TICKET_TYPES = useMemo(() => getTicketTypes(), [event, availableTypes]);

    // Log ticket types for debugging
    React.useEffect(() => {
        if (__DEV__) {
        }
    }, [event, TICKET_TYPES]);

    const [ticketCounts, setTicketCounts] = useState<{ [key: string]: number }>({});

    // Initialize ticket counts when TICKET_TYPES changes
    React.useEffect(() => {
        const initialCounts: { [key: string]: number } = {};
        TICKET_TYPES.forEach(tt => {
            initialCounts[tt.id] = 0;
        });
        setTicketCounts(initialCounts);
    }, [TICKET_TYPES]);

    const incrementTicket = (id: string) => {
        const hasOtherTickets = Object.keys(ticketCounts).some(key => key !== id && ticketCounts[key] > 0);

        if (hasOtherTickets) {
            Alert.alert(
                "Selection Restricted",
                "You can only buy tickets from one category at a time. Please remove other tickets to select this one."
            );
            return;
        }

        setTicketCounts(prev => ({
            ...prev,
            [id]: Math.min((prev[id] || 0) + 1, 10)
        }));
    };

    const decrementTicket = (id: string) => {
        setTicketCounts(prev => ({
            ...prev,
            [id]: Math.max((prev[id] || 0) - 1, 0)
        }));
    };

    const calculateTotal = () => {
        return TICKET_TYPES.reduce((total, ticket) => {
            return total + (ticket.price * (ticketCounts[ticket.id] || 0));
        }, 0);
    };

    const getTotalTickets = () => {
        return Object.values(ticketCounts).reduce((sum, count) => sum + count, 0);
    };

    const handleContinue = () => {
        const selectedTickets = TICKET_TYPES.filter(ticket => ticketCounts[ticket.id] > 0)
            .map(ticket => ({
                ...ticket,
                quantity: ticketCounts[ticket.id]
            }));

        if (selectedTickets.length === 0) {
            return;
        }

        (navigation as any).navigate('ConfirmPay', {
            event,
            tickets: selectedTickets,
            total: calculateTotal()
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.text, marginTop: 16 }}>Loading ticket types...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Select Tickets</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Event Info */}
                <View style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                        {event.name || (event as any).title}
                    </Text>
                    <View style={styles.eventInfo}>
                        <Feather name="calendar" size={14} color={colors.primary} />
                        <Text style={[styles.eventInfoText, { color: colors.textSecondary }]}>
                            {event.date ? (() => {
                                try {
                                    return new Date(event.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    });
                                } catch {
                                    return event.date;
                                }
                            })() : 'TBD'}
                        </Text>
                    </View>
                    <View style={styles.eventInfo}>
                        <Feather name="map-pin" size={14} color={colors.primary} />
                        <Text style={[styles.eventInfoText, { color: colors.textSecondary }]}>
                            {event.location || 'TBD'}
                        </Text>
                    </View>
                </View>

                {/* Ticket Types */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose Your Experience</Text>

                {TICKET_TYPES.map((ticket) => (
                    <View
                        key={ticket.id}
                        style={[
                            styles.ticketCard,
                            {
                                backgroundColor: colors.surface,
                                borderColor: ticketCounts[ticket.id] > 0 ? colors.primary : colors.border,
                                borderWidth: ticketCounts[ticket.id] > 0 ? 2 : 1
                            }
                        ]}
                    >
                        <View style={styles.ticketHeader}>
                            <View style={styles.ticketTitleRow}>
                                <View style={[styles.iconBadge, { backgroundColor: `${ticket.color}20` }]}>
                                    <Feather name={ticket.icon as any} size={20} color={ticket.color} />
                                </View>
                                <View style={styles.ticketTitleContainer}>
                                    <Text style={[styles.ticketName, { color: colors.text }]}>{ticket.name}</Text>
                                    <Text style={[styles.ticketPrice, { color: colors.primary }]}>{formatPrice(ticket.price)}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Features */}
                        <View style={styles.featuresContainer}>
                            {ticket.features.map((feature, index) => (
                                <View key={index} style={styles.featureRow}>
                                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                    <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Counter */}
                        <View style={styles.counterContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.counterButton,
                                    {
                                        backgroundColor: colors.inputBackground,
                                        opacity: ticketCounts[ticket.id] === 0 ? 0.5 : 1
                                    }
                                ]}
                                onPress={() => decrementTicket(ticket.id)}
                                disabled={ticketCounts[ticket.id] === 0}
                            >
                                <Feather name="minus" size={20} color={colors.text} />
                            </TouchableOpacity>

                            <Text style={[styles.counterText, { color: colors.text }]}>
                                {ticketCounts[ticket.id] || 0}
                            </Text>

                            <TouchableOpacity
                                style={[styles.counterButton, { backgroundColor: colors.primary }]}
                                onPress={() => incrementTicket(ticket.id)}
                            >
                                <Feather name="plus" size={20} color={theme === 'dark' ? '#000' : '#fff'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Footer */}
            {getTotalTickets() > 0 && (
                <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                    <View style={styles.totalContainer}>
                        <View>
                            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                                {getTotalTickets()} {getTotalTickets() === 1 ? 'Ticket' : 'Tickets'}
                            </Text>
                            <Text style={[styles.totalAmount, { color: colors.text }]}>
                                {formatPrice(calculateTotal())}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.continueButton, { backgroundColor: colors.primary }]}
                            onPress={handleContinue}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.continueButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
                                Continue
                            </Text>
                            <Feather name="arrow-right" size={20} color={theme === 'dark' ? '#000' : '#fff'} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 34,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    eventCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    eventInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    eventInfoText: {
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    ticketCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
    },
    ticketHeader: {
        marginBottom: 16,
    },
    ticketTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    ticketTitleContainer: {
        flex: 1,
    },
    ticketName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    ticketPrice: {
        fontSize: 16,
        fontWeight: '600',
    },
    featuresContainer: {
        marginBottom: 16,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    featureText: {
        fontSize: 14,
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    counterButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterText: {
        fontSize: 24,
        fontWeight: 'bold',
        minWidth: 40,
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 1,
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 25,
        gap: 8,
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default TicketSelection;
