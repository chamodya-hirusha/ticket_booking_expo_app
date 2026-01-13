import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Event, getEventImageUrl } from '../constants';

const { width } = Dimensions.get('window');

const Favorites = () => {
    const { colors, theme } = useTheme();
    const { favorites, toggleFavorite } = useFavorites();
    const navigation = useNavigation();

    const renderFavoriteItem = ({ item }: { item: Event }) => (
        <TouchableOpacity
            style={[styles.favoriteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => (navigation as any).navigate('EventDetails', { event: item })}
            activeOpacity={0.9}
        >
            <Image
                source={{ uri: getEventImageUrl(item.image) }}
                style={styles.favoriteImage}
                resizeMode="cover"
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={styles.favoriteGradient}
            >
                <View style={styles.favoriteContent}>
                    <Text style={styles.favoriteTitle} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.favoriteInfoRow}>
                        <Feather name="calendar" size={12} color={colors.primary} />
                        <Text style={[styles.favoriteInfo, { color: colors.textSecondary }]}>{item.date}</Text>
                    </View>
                    <View style={styles.favoriteInfoRow}>
                        <Feather name="map-pin" size={12} color={colors.primary} />
                        <Text style={[styles.favoriteInfo, { color: colors.textSecondary }]} numberOfLines={1}>{item.location}</Text>
                    </View>
                </View>
            </LinearGradient>
            <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
                onPress={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item);
                }}
            >
                <Feather name="heart" size={20} color="#ff0055" fill="#ff0055" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
                <Feather name="heart" size={64} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Favorites Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Start adding events to your favorites by tapping the heart icon
            </Text>
            <TouchableOpacity
                style={[styles.exploreButton, { backgroundColor: colors.primary }]}
                onPress={() => (navigation as any).navigate('MainTabs', { screen: 'HomeTab' })}
            >
                <Text style={[styles.exploreButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
                    Explore Events
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Favorites</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        {favorites.length} {favorites.length === 1 ? 'event' : 'events'} saved
                    </Text>
                </View>
            </View>

            {favorites.length === 0 ? (
                renderEmptyState()
            ) : (
                <FlatList
                    data={favorites}
                    renderItem={renderFavoriteItem}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.favoritesList}
                    showsVerticalScrollIndicator={false}
                    columnWrapperStyle={styles.columnWrapper}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
    },
    favoritesList: {
        paddingHorizontal: 12,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    favoriteCard: {
        width: (width - 40) / 2,
        height: 240,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        position: 'relative',
        marginHorizontal: 4,
    },
    favoriteImage: {
        width: '100%',
        height: '100%',
    },
    favoriteGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        justifyContent: 'flex-end',
        padding: 12,
    },
    favoriteContent: {
        marginBottom: 8,
    },
    favoriteTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    favoriteInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
        gap: 4,
    },
    favoriteInfo: {
        fontSize: 10,
    },
    removeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    exploreButton: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 25,
    },
    exploreButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Favorites;
