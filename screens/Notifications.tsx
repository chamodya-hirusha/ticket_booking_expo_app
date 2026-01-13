import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '../context/NotificationContext';
import { Notification } from '../services/notifications';

const Notifications = () => {
    const { colors, theme } = useTheme();
    const navigation = useNavigation();
    const {
        notifications,
        isLoading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        addNotification
    } = useNotifications();
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshNotifications();
        setRefreshing(false);
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
        // Add success notification
        await addNotification({
            id: `mark_all_read_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: 'All Notifications Marked as Read',
            message: 'All notifications have been marked as read successfully.',
            time: 'Just now',
            type: 'system',
            read: false,
            createdAt: new Date().toISOString(),
        });
    };

    const handleNotificationPress = async (notification: Notification) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }
        setSelectedNotification(notification);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'ticket': return 'tag';
            case 'promo': return 'percent';
            case 'event': return 'calendar';
            case 'system': return 'info';
            default: return 'bell';
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'ticket': return '#4CAF50';
            case 'promo': return '#FF9800';
            case 'event': return '#2196F3';
            case 'system': return '#9C27B0';
            default: return colors.text;
        }
    };

    const renderItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[
                styles.notificationItem,
                {
                    backgroundColor: item.read ? 'transparent' : (theme === 'dark' ? '#1a1a2e' : colors.surface),
                    borderColor: colors.border
                }
            ]}
            activeOpacity={0.7}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${getIconColor(item.type)}20` }]}>
                <Feather name={getIcon(item.type) as any} size={24} color={getIconColor(item.type)} />
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.time, { color: colors.textSecondary }]}>{item.time}</Text>
                </View>
                <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.message}
                </Text>
            </View>
            {!item.read && (
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                {notifications.length > 0 && (
                    <TouchableOpacity onPress={handleMarkAllAsRead}>
                        <Text style={[styles.markAllRead, { color: colors.primary }]}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {isLoading && notifications.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading notifications...</Text>
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Feather name="bell-off" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notifications yet</Text>
                    <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                        You'll see your notifications here when they arrive
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                />
            )}
            {/* Notification Detail Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={!!selectedNotification}
                onRequestClose={() => setSelectedNotification(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[
                        styles.modalContent,
                        {
                            backgroundColor: theme === 'dark' ? 'rgba(10, 10, 26, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                            borderColor: colors.border
                        }
                    ]}>
                        {selectedNotification && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={[styles.modalIcon, { backgroundColor: `${getIconColor(selectedNotification.type)}20` }]}>
                                        <Feather name={getIcon(selectedNotification.type) as any} size={32} color={getIconColor(selectedNotification.type)} />
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedNotification(null)} style={styles.closeButton}>
                                        <Ionicons name="close" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedNotification.title}</Text>
                                <Text style={[styles.modalTime, { color: colors.textSecondary }]}>{selectedNotification.time}</Text>

                                <ScrollView style={styles.modalBody}>
                                    <Text style={[styles.modalMessage, { color: colors.text }]}>
                                        {selectedNotification.message}
                                    </Text>
                                </ScrollView>

                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                    onPress={() => setSelectedNotification(null)}
                                >
                                    <Text style={[styles.modalButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>Close</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
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
        borderBottomWidth: 1,
        borderBottomColor: 'transparent', // Can be adjusted
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    markAllRead: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        padding: 20,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
        marginRight: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 8,
    },
    time: {
        fontSize: 12,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    modalIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        padding: 4,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    modalTime: {
        fontSize: 14,
        marginBottom: 16,
    },
    modalBody: {
        maxHeight: 200,
        marginBottom: 24,
    },
    modalMessage: {
        fontSize: 16,
        lineHeight: 24,
    },
    modalButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
    },
});

export default Notifications;
