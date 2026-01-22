import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    FlatList,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Event, getEventImageUrl } from '../constants';
import { useFavorites } from '../context/FavoritesContext';
import { apiService } from '../services/api';
import { transformEvent } from '../utils/event';

type SeeAllRouteProp = RouteProp<{
    SeeAll: {
        title: string;
        data?: Event[];
        category?: string;
        searchParams?: {
            text?: string;
            category?: string;
            location?: string;
        };
    }
}, 'SeeAll'>;

const SeeAll = () => {
    const { colors, theme } = useTheme();
    const navigation = useNavigation();
    const route = useRoute<SeeAllRouteProp>();
    const { title, data: initialData, category, searchParams } = route.params;
    const { isFavorite, toggleFavorite } = useFavorites();

    const [events, setEvents] = useState<Event[]>(initialData || []);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 10;

    // Fetch events with pagination
    const fetchEvents = useCallback(async (pageNum: number = 0) => {
        try {
            setLoading(true);
            setError(null);

            let response;

            // Use search if searchParams provided
            if (searchParams) {
                response = await apiService.event.searchPublicEvents({
                    text: searchParams.text,
                    category: searchParams.category || category,
                    location: searchParams.location,
                    page: pageNum,
                    size: PAGE_SIZE,
                    sortBy: 'date',
                    direction: 'ASC',
                });
            }
            // Use category filter if category provided
            else if (category) {
                response = await apiService.event.getAllPublicEvents({
                    category: category,
                    page: pageNum,
                    size: PAGE_SIZE,
                    sortBy: 'date',
                    direction: 'ASC',
                });
            }
            // Use scheduled events (default)
            else {
                response = await apiService.event.getScheduledPublicEvents({
                    page: pageNum,
                    size: PAGE_SIZE,
                    sortBy: 'date',
                    direction: 'ASC',
                });
            }


            if (response.success && response.data) {
                let eventsArray: any[] = [];
                let paginationInfo: any = null;
                const dataObj = response.data as any;

                // Handle nested response structure (same as Home screen)
                if (Array.isArray(dataObj)) {
                    eventsArray = dataObj;
                } else if (dataObj && typeof dataObj === 'object') {
                    // Handle response with 'code' field
                    if ('code' in dataObj && 'content' in dataObj) {
                        const paginatedResponse = dataObj.content;
                        if (paginatedResponse && typeof paginatedResponse === 'object' && 'content' in paginatedResponse) {
                            if (Array.isArray(paginatedResponse.content)) {
                                eventsArray = paginatedResponse.content;
                                paginationInfo = paginatedResponse;
                            }
                        } else if (Array.isArray(paginatedResponse)) {
                            eventsArray = paginatedResponse;
                        }
                    }
                    // Handle standard PaginatedResponse format
                    else if ('content' in dataObj) {
                        if (Array.isArray(dataObj.content)) {
                            eventsArray = dataObj.content;
                            paginationInfo = dataObj;
                        } else if (dataObj.content && typeof dataObj.content === 'object' && 'content' in dataObj.content) {
                            if (Array.isArray(dataObj.content.content)) {
                                eventsArray = dataObj.content.content;
                                paginationInfo = dataObj.content;
                            }
                        }
                    }
                }

                // Update pagination info - always use totalElements from API
                if (paginationInfo) {
                    if (paginationInfo.totalElements !== undefined) {
                        setTotalElements(paginationInfo.totalElements);
                        const calculatedPages = Math.ceil(paginationInfo.totalElements / PAGE_SIZE);
                        setTotalPages(calculatedPages);
                    }
                    if (paginationInfo.totalPages !== undefined) {
                        setTotalPages(paginationInfo.totalPages);
                        if (paginationInfo.totalElements === undefined) {
                            setTotalElements(paginationInfo.totalPages * PAGE_SIZE);
                        }
                    }
                } else if (eventsArray.length > 0) {

                    if (totalElements === 0) {
                        setTotalElements(eventsArray.length);
                        setTotalPages(1);
                    }
                }

                if (eventsArray.length > 0) {
                    // Transform events
                    const transformedEvents = eventsArray
                        .filter((event: any) => event && (event.id || event.name))
                        .map((event: any) => transformEvent(event));
                    if (!initialData || pageNum !== 0) {
                        setEvents(transformedEvents);
                    }
                    setCurrentPage(pageNum);
                } else {
                    setEvents([]);
                }
            } else {
                const errorMsg = response.error || response.message || 'Failed to load events';
                setError(errorMsg);
                setEvents([]);
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Network error. Please check your connection.';
            setError(errorMessage);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [category, searchParams, PAGE_SIZE]);

    // Load initial events if not provided
    useEffect(() => {
        if (!initialData || initialData.length === 0) {
            fetchEvents(0);
        } else {
            setEvents(initialData);
            setCurrentPage(0);
            const fetchPaginationInfo = async () => {
                try {
                    await fetchEvents(0);
                } catch (error) {
                    Alert.alert('Error', error.message);
                }
            };
            fetchPaginationInfo();
        }
    }, []);


    // Navigation functions
    const goToPage = (pageNum: number) => {
        if (pageNum >= 0 && pageNum < totalPages && !loading) {
            setCurrentPage(pageNum);
            fetchEvents(pageNum);
        }
    };

    const goToNextPage = () => {
        if (currentPage < totalPages - 1) {
            goToPage(currentPage + 1);
        }
    };

    const goToPrevPage = () => {
        if (currentPage > 0) {
            goToPage(currentPage - 1);
        }
    };

    // Render pagination component
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const isFirstPage = currentPage === 0;
        const isLastPage = currentPage >= totalPages - 1;

        const getVisiblePages = () => {
            const pages: number[] = [];
            const maxVisible = 5;

            if (totalPages <= maxVisible) {
                for (let i = 0; i < totalPages; i++) {
                    pages.push(i);
                }
            } else {
                if (currentPage < 3) {
                    for (let i = 0; i < maxVisible; i++) {
                        pages.push(i);
                    }
                } else if (currentPage > totalPages - 4) {
                    for (let i = totalPages - maxVisible; i < totalPages; i++) {
                        pages.push(i);
                    }
                } else {
                    for (let i = currentPage - 2; i <= currentPage + 2; i++) {
                        pages.push(i);
                    }
                }
            }
            return pages;
        };

        const visiblePages = getVisiblePages();
        const showFirstPage = currentPage > 2 && totalPages > 5;
        const showLastPage = currentPage < totalPages - 3 && totalPages > 5;
        const showLeftEllipsis = currentPage > 3 && totalPages > 5;
        const showRightEllipsis = currentPage < totalPages - 4 && totalPages > 5;

        return (
            <View style={[styles.paginationContainer, { backgroundColor: 'transparent' }]}>
                <View style={[styles.paginationControls, { backgroundColor: theme === 'dark' ? colors.surface : '#f5f5f5' }]}>
                    {/* First Page Button */}
                    {showFirstPage && (
                        <>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.paginationTextButton,
                                    pressed && { backgroundColor: colors.primary + '20', opacity: 0.8 }
                                ]}
                                onPress={() => goToPage(0)}
                                disabled={loading}
                            >
                                <Text style={[styles.paginationInactiveText, { color: colors.textSecondary }]}>1</Text>
                            </Pressable>
                            {showLeftEllipsis && (
                                <View style={styles.ellipsis}>
                                    <Text style={[styles.ellipsisText, { color: colors.textSecondary }]}>...</Text>
                                </View>
                            )}
                        </>
                    )}

                    {/* Previous Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.paginationButton,
                            pressed && { backgroundColor: colors.primary + '20', opacity: 0.8 },
                            (isFirstPage || loading) && { opacity: 0.4 }
                        ]}
                        onPress={goToPrevPage}
                        disabled={isFirstPage || loading}
                    >
                        <Feather
                            name="chevron-left"
                            size={18}
                            color={colors.textSecondary}
                        />
                    </Pressable>

                    {/* Page Numbers */}
                    <View style={styles.pageNumbers}>
                        {visiblePages.map((pageNum) => {
                            const isActive = currentPage === pageNum;
                            if (isActive) {
                                return (
                                    <Pressable
                                        key={pageNum}
                                        style={({ pressed }) => [
                                            styles.pageNumberButtonActive,
                                            {
                                                backgroundColor: colors.primary,
                                            },
                                            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }
                                        ]}
                                        onPress={() => goToPage(pageNum)}
                                        disabled={loading}
                                    >
                                        <Text style={[
                                            styles.pageNumberTextActive,
                                            {
                                                color: theme === 'dark' ? '#000' : '#fff',
                                            }
                                        ]}>
                                            {pageNum + 1}
                                        </Text>
                                    </Pressable>
                                );
                            } else {
                                return (
                                    <Pressable
                                        key={pageNum}
                                        style={({ pressed }) => [
                                            styles.paginationTextButton,
                                            pressed && { backgroundColor: colors.primary + '20', opacity: 0.8 }
                                        ]}
                                        onPress={() => goToPage(pageNum)}
                                        disabled={loading}
                                    >
                                        <Text style={[styles.paginationInactiveText, { color: colors.textSecondary }]}>
                                            {pageNum + 1}
                                        </Text>
                                    </Pressable>
                                );
                            }
                        })}
                    </View>

                    {/* Next Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.paginationButton,
                            pressed && { backgroundColor: colors.primary + '20', opacity: 0.8 },
                            (isLastPage || loading) && { opacity: 0.4 }
                        ]}
                        onPress={goToNextPage}
                        disabled={isLastPage || loading}
                    >
                        <Feather
                            name="chevron-right"
                            size={18}
                            color={colors.textSecondary}
                        />
                    </Pressable>

                    {/* Last Page Button */}
                    {showLastPage && (
                        <>
                            {showRightEllipsis && (
                                <View style={styles.ellipsis}>
                                    <Text style={[styles.ellipsisText, { color: colors.textSecondary }]}>...</Text>
                                </View>
                            )}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.paginationTextButton,
                                    pressed && { backgroundColor: colors.primary + '20', opacity: 0.8 }
                                ]}
                                onPress={() => goToPage(totalPages - 1)}
                                disabled={loading}
                            >
                                <Text style={[styles.paginationInactiveText, { color: colors.textSecondary }]}>{totalPages}</Text>
                            </Pressable>
                        </>
                    )}
                </View>
            </View>
        );
    };

    // Format date helper
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'TBD';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    const renderItem = ({ item }: { item: Event }) => {
        const favorite = isFavorite(item.id);

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => (navigation as any).navigate('EventDetails', { event: item })}
                activeOpacity={0.8}
            >
                <Image source={{ uri: getEventImageUrl(item.image) }} style={styles.image} />
                <View style={styles.content}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.infoRow}>
                        <Feather name="calendar" size={12} color={colors.primary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            {formatDate(item.date)}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Feather name="map-pin" size={12} color={colors.primary} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.location || 'TBD'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.favoriteButton, { backgroundColor: colors.inputBackground }]}
                    onPress={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item);
                    }}
                >
                    <Feather name="heart" size={18} color={favorite ? '#ff0055' : colors.textSecondary} fill={favorite ? '#ff0055' : 'transparent'} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
                <View style={styles.placeholder} />
            </View>

            {loading && events.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading events...</Text>
                </View>
            ) : error && events.length === 0 ? (
                <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={48} color={colors.error || '#ff4444'} />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        onPress={() => fetchEvents(0)}
                    >
                        <Text style={[styles.retryButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : events.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Feather name="calendar" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No events found</Text>
                </View>
            ) : (
                <>
                    {loading && (
                        <View style={[styles.loadingOverlay, { backgroundColor: colors.background + '80' }]}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )}
                    <FlatList
                        data={events}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={!loading}
                        ListFooterComponent={renderPagination()}
                    />
                </>
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
    listContent: {
        padding: 20,
        paddingBottom: 110,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    card: {
        flexDirection: 'row',
        marginBottom: 16,
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 16,
    },
    content: {
        flex: 1,
        marginLeft: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 6,
    },
    infoText: {
        fontSize: 12,
    },
    favoriteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorText: {
        marginTop: 12,
        marginBottom: 20,
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '600',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    retryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
    },
    paginationContainer: {
        padding: 20,
        paddingTop: 16,
        paddingBottom: 16,
        borderTopWidth: 0,
        gap: 16,
        borderRadius: 12,
    },
    paginationControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginHorizontal: 0,
    },
    paginationButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0,
    },
    paginationTextButton: {
        minWidth: 28,
        height: 28,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    paginationInactiveText: {
        fontSize: 12,
        fontWeight: '500',
    },
    pageNumbers: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginHorizontal: 4,
    },
    pageNumberButtonActive: {
        minWidth: 28,
        height: 28,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    pageNumberTextActive: {
        fontSize: 12,
        fontWeight: '600',
    },
    ellipsis: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ellipsisText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default SeeAll;
