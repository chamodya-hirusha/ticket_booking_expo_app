import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Dimensions,
  Modal,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Event, getEventImageUrl } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: '1', name: 'All', value: null, icon: 'grid-outline' },
  { id: '2', name: 'Music', value: 'MUSIC', icon: 'musical-notes-outline' },
  { id: '3', name: 'Sports', value: 'SPORTS', icon: 'football-outline' },
  { id: '4', name: 'Tech', value: 'TECH', icon: 'hardware-chip-outline' },
  { id: '5', name: 'Art', value: 'ART', icon: 'color-palette-outline' },
  { id: '6', name: 'Business', value: 'BUSINESS', icon: 'briefcase-outline' },
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user, refreshUser, isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('1');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('Anytime');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(500);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track which event images have failed to load
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Live Search State
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pull to Refresh State
  const [refreshing, setRefreshing] = useState(false);

  // Live search function with debouncing
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch regular events
      fetchEvents();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get selected category value
      const selectedCat = CATEGORIES.find(cat => cat.id === selectedCategory);
      const categoryValue = selectedCat?.value || undefined;

      const searchParams: any = {
        text: query.trim(),
        page: 0,
        size: 20,
        sortBy: 'date',
        direction: 'DESC',
      };

      if (categoryValue) {
        searchParams.category = categoryValue;
      }

      const response = await apiService.event.searchPublicEvents(searchParams);

      if (response.success && response.data) {
        // Handle different response structures (same as fetchEvents)
        let eventsArray: any[] = [];

        if (Array.isArray(response.data)) {
          eventsArray = response.data;
        } else if (response.data && typeof response.data === 'object') {
          const dataObj = response.data as any;

          if ('code' in dataObj && 'content' in dataObj) {
            const paginatedResponse = dataObj.content;
            if (paginatedResponse && typeof paginatedResponse === 'object' && 'content' in paginatedResponse) {
              if (Array.isArray(paginatedResponse.content)) {
                eventsArray = paginatedResponse.content;
              }
            } else if (Array.isArray(paginatedResponse)) {
              eventsArray = paginatedResponse;
            }
          } else if ('content' in dataObj) {
            if (Array.isArray(dataObj.content)) {
              eventsArray = dataObj.content;
            } else if (dataObj.content && typeof dataObj.content === 'object' && 'content' in dataObj.content) {
              if (Array.isArray(dataObj.content.content)) {
                eventsArray = dataObj.content.content;
              }
            }
          } else if (Array.isArray(dataObj)) {
            eventsArray = dataObj;
          }
        }

        // Transform events (same as fetchEvents)
        const transformedEvents = eventsArray.map((event: any) => {
          const imageValue = (event.imageUrl && event.imageUrl.trim() !== '')
            || (event.image_url && event.image_url.trim() !== '')
            || (event.image && event.image.trim() !== '')
            ? (event.imageUrl || event.image_url || event.image)
            : null;

          return {
            ...event,
            id: String(event.id),
            image: imageValue,
          };
        });

        setEvents(transformedEvents);
      } else {
        setError(response.error || 'Search failed');
        setEvents([]);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An error occurred while searching';
      setError(errorMessage);
      setEvents([]);

    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  // Debounced search effect
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 500); // 500ms debounce delay

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Advanced Search Modal State
  const [searchText, setSearchText] = useState('');
  const [searchCategory, setSearchCategory] = useState<string | null>(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

  // Date Picker Modal State
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [selectedDateType, setSelectedDateType] = useState<'start' | 'end' | null>(null);
  const [tempSelectedDate, setTempSelectedDate] = useState<Date>(new Date());

  // Refresh user data when component mounts if user is authenticated
  useEffect(() => {
    if (isAuthenticated && (!user || !user.name)) {
      refreshUser();
    }
  }, [isAuthenticated]);

  // Helper function to fetch events with improved error handling
  const fetchEvents = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Get selected category value
      const selectedCat = CATEGORIES.find(cat => cat.id === selectedCategory);
      const categoryValue = selectedCat?.value || undefined;

      // Use public endpoint that doesn't require authentication
      // If a category is selected (not "All"), use getAllPublicEvents with category filter
      const response = categoryValue
        ? await apiService.event.getAllPublicEvents({
          category: categoryValue,
          page: 0,
          size: 20,
          sortBy: 'date',
          direction: 'ASC'
        })
        : await apiService.event.getScheduledPublicEvents({
          page: 0,
          size: 20,
          sortBy: 'date',
          direction: 'ASC'
        });


      if (response.success && response.data) {
        // Handle different response structures
        let eventsArray: any[] = [];

        // Check if data is already an array
        if (Array.isArray(response.data)) {
          eventsArray = response.data;
        }
        // Check if data has content property (PaginatedResponse)
        else if (response.data && typeof response.data === 'object') {
          const dataObj = response.data as any;

          // Handle response with 'code' field (alternative API format)
          if ('code' in dataObj && 'content' in dataObj) {
            // Response format: { code: "00", content: PaginatedResponse, message: "..." }
            const paginatedResponse = dataObj.content;
            if (paginatedResponse && typeof paginatedResponse === 'object' && 'content' in paginatedResponse) {
              if (Array.isArray(paginatedResponse.content)) {
                eventsArray = paginatedResponse.content;
              } else {
                eventsArray = [];
              }
            } else if (Array.isArray(paginatedResponse)) {
              // content might be directly an array
              eventsArray = paginatedResponse;
            } else {
              eventsArray = [];
            }
          }
          // Handle standard PaginatedResponse format
          else if ('content' in dataObj) {
            if (Array.isArray(dataObj.content)) {
              // Direct array in content property
              eventsArray = dataObj.content;
            } else if (dataObj.content === null || dataObj.content === undefined) {
              eventsArray = [];
            } else if (dataObj.content && typeof dataObj.content === 'object' && 'content' in dataObj.content) {
              // Nested structure: response.data.content.content (PaginatedResponse wrapper)
              if (Array.isArray(dataObj.content.content)) {
                eventsArray = dataObj.content.content;
              } else {
                eventsArray = [];
              }
            } else {
              eventsArray = [];
            }
          } else {
            // Try to find events in nested structures
            const dataObj = response.data as any;
            const possibleEventArrays: any[][] = [
              dataObj.events,
              dataObj.items,
              dataObj.results,
            ].filter((item): item is any[] => Array.isArray(item));

            if (possibleEventArrays.length > 0) {
              eventsArray = possibleEventArrays[0];
            }
          }
        }

        if (eventsArray.length > 0) {
          // Validate and transform events
          const transformedEvents = eventsArray
            .filter((event: any) => {
              // Basic validation: event must have id and name
              const isValid = event &&
                (event.id !== null && event.id !== undefined) &&
                (event.name !== null && event.name !== undefined);

              return isValid;
            })
            .map((event: any) => {
           
              const imageValue = (event.imageUrl && event.imageUrl.trim() !== '')
                || (event.image_url && event.image_url.trim() !== '')
                || (event.image && event.image.trim() !== '')
                ? (event.imageUrl || event.image_url || event.image)
                : null;



              return {
                ...event,
                id: String(event.id), 
                image: imageValue,
              };
            });

          if (transformedEvents.length > 0) {
            setEvents(transformedEvents);
          } else {

            setEvents([]);
          }
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
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (searchQuery.trim()) {
        await performSearch(searchQuery);
      } else {
     
        await fetchEvents(false); 
      }
    } catch (err) {

    } finally {
      setRefreshing(false);
    }
  }, [searchQuery, performSearch]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      fetchEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // Helper function to format date and time
  const formatEventDateTime = (date: string, startTime?: string) => {
    try {
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      if (startTime) {
        return `${formattedDate} • ${startTime}`;
      }
      return formattedDate;
    } catch {
      return date;
    }
  };

  // Helper function to get price display
  const getPriceDisplay = (item: Event) => {
    const prices = [item.generalTicketPrice, item.premiumTicketPrice, item.vipTicketPrice].filter(p => p > 0);
    if (prices.length === 0) return 'Free';
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) {
      return `$${minPrice.toFixed(0)}`;
    }
    return `$${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)}`;
  };

  const renderEventItem = ({ item }: { item: Event }) => {
    const favorite = isFavorite(item.id);
    const imageUrl = getEventImageUrl(item.image);
    const hasImageError = imageErrors.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => (navigation as any).navigate('EventDetails', { event: item })}
        activeOpacity={0.9}
      >
        {hasImageError ? (
          <View style={[styles.eventImage, styles.eventImagePlaceholder, { backgroundColor: colors.inputBackground }]}>
            <MaterialIcons name="image" size={40} color={colors.textSecondary} />
            <Text style={[styles.eventImagePlaceholderText, { color: colors.textSecondary }]}>No Image</Text>
          </View>
        ) : (
          <Image
            source={{ uri: imageUrl }}
            style={styles.eventImage}
            contentFit="cover"
            transition={200}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            onError={(error) => {
              setImageErrors(prev => new Set(prev).add(item.id));

            }}
            onLoad={() => {
              setImageErrors(prev => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
              });
            }}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.eventGradient}
        >
          <View style={styles.eventContent}>
            <Text style={styles.eventTitle} numberOfLines={2}>{item.name}</Text>
            <View style={styles.eventInfoRow}>
              <Feather name="calendar" size={12} color={colors.primary} />
              <Text style={[styles.eventInfo, { color: colors.textSecondary }]}>{formatEventDateTime(item.date, item.startTime)}</Text>
            </View>
            <View style={styles.eventInfoRow}>
              <Feather name="map-pin" size={12} color={colors.primary} />
              <Text style={[styles.eventInfo, { color: colors.textSecondary }]} numberOfLines={1}>{item.location}</Text>
            </View>
          </View>
          <View style={[styles.priceTag, { backgroundColor: colors.primary }]}>
            <Text style={[styles.priceText, { color: theme === 'dark' ? '#000' : '#fff' }]}>{getPriceDisplay(item)}</Text>
          </View>
        </LinearGradient>
        <TouchableOpacity
          style={[styles.favoriteButtonCard, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item);
          }}
        >
          <Feather name="heart" size={20} color={favorite ? '#ff0055' : '#fff'} fill={favorite ? '#ff0055' : 'transparent'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderPopularItem = ({ item }: { item: Event }) => {
    const favorite = isFavorite(item.id);

    return (
      <TouchableOpacity
        style={[styles.popularCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => (navigation as any).navigate('EventDetails', { event: item })}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: getEventImageUrl(item.image) }}
          style={styles.popularImage}
          contentFit="cover"
          onError={(error) => {

          }}
          onLoad={() => {
          }}
        />
        <View style={styles.popularContent}>
          <Text style={[styles.popularTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <View style={styles.popularRow}>
            <Feather name="calendar" size={12} color={colors.primary} />
            <Text style={[styles.popularText, { color: colors.textSecondary }]}>{formatEventDateTime(item.date, item.startTime)}</Text>
          </View>
          <View style={styles.popularRow}>
            <Feather name="map-pin" size={12} color={colors.primary} />
            <Text style={[styles.popularText, { color: colors.textSecondary }]} numberOfLines={1}>{item.location}</Text>
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name && user.name.trim() ? user.name.trim().split(' ')[0] : 'Guest'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.surface }]}
              onPress={() => (navigation as any).navigate('Notifications')}
            >
              <Feather name="bell" size={20} color={colors.text} />
              <View style={[styles.notificationBadge, { backgroundColor: colors.notification }]} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface }]}>
              <Image
                source={{ uri: user?.avatar || 'https://api.dicebear.com/7.x/notionists/png?seed=User&backgroundColor=3b82f6' }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Feather name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search events, artists, venues..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => {
              // Clear timeout and search immediately on submit
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
              }
              performSearch(searchQuery);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                fetchEvents();
              }}
              style={{ padding: 4 }}
            >
              <Feather name="x" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.primary }]}
            onPress={() => setIsFilterVisible(true)}
          >
            <Feather name="sliders" size={18} color={theme === 'dark' ? '#000' : '#fff'} />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <FlatList
            horizontal
            data={CATEGORIES}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selectedCategory === item.id ? colors.primary : colors.surface,
                    borderColor: selectedCategory === item.id ? colors.primary : colors.border
                  }
                ]}
                onPress={() => setSelectedCategory(item.id)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={selectedCategory === item.id ? (theme === 'dark' ? '#000' : '#fff') : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.categoryText,
                    { color: selectedCategory === item.id ? (theme === 'dark' ? '#000' : '#fff') : colors.textSecondary }
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Featured Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Events</Text>
            {events.length > 0 && (
              <TouchableOpacity onPress={() => {
                const selectedCat = CATEGORIES.find(cat => cat.id === selectedCategory);
                (navigation as any).navigate('SeeAll', {
                  title: 'Featured Events',
                  data: events,
                  category: selectedCat?.value,
                });
              }}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading events...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={48} color={colors.error || '#ff4444'} />
              <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={() => fetchEvents()}
              >
                <Text style={[styles.retryButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="calendar" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No events available</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              data={events}
              renderItem={renderEventItem}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventsList}
              snapToInterval={width * 0.75 + 16}
              decelerationRate="fast"
            />
          )}
        </View>

        {/* Popular Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Near You</Text>
            {events.length > 0 && (
              <TouchableOpacity onPress={() => {
                const selectedCat = CATEGORIES.find(cat => cat.id === selectedCategory);
                (navigation as any).navigate('SeeAll', {
                  title: 'Popular Near You',
                  data: events,
                  category: selectedCat?.value,
                });
              }}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {!loading && !error && events.length > 0 && (
            <FlatList
              data={events.slice(0, 5)}
              renderItem={renderPopularItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Advanced Search Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterVisible}
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff',
              borderColor: colors.border
            }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Advanced Search</Text>
              <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Search Text */}
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Search Text</Text>
              <View style={[styles.locationInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  placeholder="Search events, artists, venues..."
                  placeholderTextColor={colors.textSecondary}
                  style={{ flex: 1, marginLeft: 10, color: colors.text }}
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>

              {/* Category */}
              <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: 20 }]}>Category</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: searchCategory === null ? colors.primary : colors.inputBackground,
                      borderColor: searchCategory === null ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => setSearchCategory(null)}
                >
                  <Text style={{
                    color: searchCategory === null ? (theme === 'dark' ? '#000' : '#fff') : colors.text
                  }}>
                    All
                  </Text>
                </TouchableOpacity>
                {CATEGORIES.filter(cat => cat.value !== null).map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: searchCategory === cat.value ? colors.primary : colors.inputBackground,
                        borderColor: searchCategory === cat.value ? colors.primary : colors.border
                      }
                    ]}
                    onPress={() => setSearchCategory(cat.value || null)}
                  >
                    <Text style={{
                      color: searchCategory === cat.value ? (theme === 'dark' ? '#000' : '#fff') : colors.text
                    }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Location */}
              <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: 20 }]}>Location</Text>
              <View style={[styles.locationInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  placeholder="Enter city or district"
                  placeholderTextColor={colors.textSecondary}
                  style={{ flex: 1, marginLeft: 10, color: colors.text }}
                  value={searchLocation}
                  onChangeText={setSearchLocation}
                />
              </View>

              {/* Date Range */}
              <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: 20 }]}>Date Range</Text>
              <View style={styles.dateRangeContainer}>
                <View style={[styles.dateInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, flex: 1, marginRight: 8 }]}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDateType('start');
                      setTempSelectedDate(startDate ? new Date(startDate) : new Date());
                      setIsDatePickerVisible(true);
                    }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  </TouchableOpacity>
                  <TextInput
                    placeholder="Start (YYYY-MM-DD)"
                    placeholderTextColor={colors.textSecondary}
                    style={{ flex: 1, color: colors.text }}
                    value={startDate}
                    onChangeText={setStartDate}
                    editable={true}
                  />
                </View>
                <View style={[styles.dateInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, flex: 1 }]}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDateType('end');
                      setTempSelectedDate(endDate ? new Date(endDate) : new Date());
                      setIsDatePickerVisible(true);
                    }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  </TouchableOpacity>
                  <TextInput
                    placeholder="End (YYYY-MM-DD)"
                    placeholderTextColor={colors.textSecondary}
                    style={{ flex: 1, color: colors.text }}
                    value={endDate}
                    onChangeText={setEndDate}
                    editable={true}
                  />
                </View>
              </View>

              {/* Sort Options */}
              <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: 20 }]}>Sort By</Text>
              <View style={styles.filterOptions}>
                {['date', 'name', 'location'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: sortBy === option ? colors.primary : colors.inputBackground,
                        borderColor: sortBy === option ? colors.primary : colors.border
                      }
                    ]}
                    onPress={() => setSortBy(option)}
                  >
                    <Text style={{
                      color: sortBy === option ? (theme === 'dark' ? '#000' : '#fff') : colors.text
                    }}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort Direction */}
              <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: 20 }]}>Sort Direction</Text>
              <View style={styles.filterOptions}>
                {(['ASC', 'DESC'] as const).map((direction) => (
                  <TouchableOpacity
                    key={direction}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: sortDirection === direction ? colors.primary : colors.inputBackground,
                        borderColor: sortDirection === direction ? colors.primary : colors.border
                      }
                    ]}
                    onPress={() => setSortDirection(direction)}
                  >
                    <Text style={{
                      color: sortDirection === direction ? (theme === 'dark' ? '#000' : '#fff') : colors.text
                    }}>
                      {direction}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.resetButton, { borderColor: colors.border }]}
                onPress={() => {
                  setSearchText('');
                  setSearchCategory(null);
                  setSearchLocation('');
                  setStartDate('');
                  setEndDate('');
                  setSortBy('date');
                  setSortDirection('DESC');
                }}
              >
                <Text style={{ color: colors.text }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  setIsFilterVisible(false);
                  setLoading(true);
                  setError(null);

                  try {
                    const searchParams: any = {
                      page: 0,
                      size: 20,
                      sortBy: sortBy,
                      direction: sortDirection,
                    };

                    if (searchText.trim()) {
                      searchParams.text = searchText.trim();
                    }
                    if (searchCategory) {
                      searchParams.category = searchCategory;
                    }
                    if (searchLocation.trim()) {
                      searchParams.location = searchLocation.trim();
                    }
                    if (startDate.trim()) {
                      searchParams.start = startDate.trim();
                    }
                    if (endDate.trim()) {
                      searchParams.end = endDate.trim();
                    }

                    const response = await apiService.event.advancedSearchPublicEvents(searchParams);

                    if (response.success && response.data) {
                      const paginatedData = response.data as any;
                      const eventsList = paginatedData.content || paginatedData.data || paginatedData || [];

                      const transformedEvents = Array.isArray(eventsList)
                        ? eventsList.map((event: any) => {
                          const imageValue = (event.imageUrl && event.imageUrl.trim() !== '')
                            || (event.image_url && event.image_url.trim() !== '')
                            || (event.image && event.image.trim() !== '')
                            ? (event.imageUrl || event.image_url || event.image)
                            : null;

                          return {
                            ...event,
                            id: String(event.id),
                            image: imageValue,
                          };
                        })
                        : [];

                      setEvents(transformedEvents);
                    } else {
                      setError(response.error || 'Failed to search events');
                    }
                  } catch (err: any) {
                    const errorMessage = err?.message || 'An error occurred while searching events';
                    setError(errorMessage);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <Text style={{ color: theme === 'dark' ? '#000' : '#fff', fontWeight: 'bold' }}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDatePickerVisible}
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <View style={styles.datePickerModalContainer}>
          <View style={[
            styles.datePickerModalContent,
            {
              backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff',
              borderColor: colors.border
            }
          ]}>
            <View style={styles.datePickerHeader}>
              <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                Select {selectedDateType === 'start' ? 'Start' : 'End'} Date
              </Text>
              <TouchableOpacity onPress={() => setIsDatePickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerBody}>
              {/* Simple Date Input Fields */}
              <View style={styles.datePickerInputs}>
                <View style={styles.datePickerInputGroup}>
                  <Text style={[styles.datePickerLabel, { color: colors.textSecondary }]}>Year</Text>
                  <TextInput
                    style={[styles.datePickerInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                    value={tempSelectedDate.getFullYear().toString()}
                    onChangeText={(text) => {
                      const year = parseInt(text) || tempSelectedDate.getFullYear();
                      const newDate = new Date(tempSelectedDate);
                      newDate.setFullYear(year);
                      setTempSelectedDate(newDate);
                    }}
                    keyboardType="numeric"
                    placeholder="YYYY"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.datePickerInputGroup}>
                  <Text style={[styles.datePickerLabel, { color: colors.textSecondary }]}>Month</Text>
                  <TextInput
                    style={[styles.datePickerInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                    value={(tempSelectedDate.getMonth() + 1).toString().padStart(2, '0')}
                    onChangeText={(text) => {
                      const month = Math.max(1, Math.min(12, parseInt(text) || tempSelectedDate.getMonth() + 1));
                      const newDate = new Date(tempSelectedDate);
                      newDate.setMonth(month - 1);
                      setTempSelectedDate(newDate);
                    }}
                    keyboardType="numeric"
                    placeholder="MM"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={2}
                  />
                </View>
                <View style={styles.datePickerInputGroup}>
                  <Text style={[styles.datePickerLabel, { color: colors.textSecondary }]}>Day</Text>
                  <TextInput
                    style={[styles.datePickerInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                    value={tempSelectedDate.getDate().toString().padStart(2, '0')}
                    onChangeText={(text) => {
                      const day = Math.max(1, Math.min(31, parseInt(text) || tempSelectedDate.getDate()));
                      const newDate = new Date(tempSelectedDate);
                      newDate.setDate(day);
                      setTempSelectedDate(newDate);
                    }}
                    keyboardType="numeric"
                    placeholder="DD"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={2}
                  />
                </View>
              </View>

              {/* Quick Date Presets */}
              <View style={styles.datePresetsContainer}>
                <Text style={[styles.datePickerLabel, { color: colors.textSecondary, marginBottom: 12 }]}>Quick Select</Text>
                <View style={styles.datePresetsRow}>
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Tomorrow', days: 1 },
                    { label: 'Next Week', days: 7 },
                    { label: 'Next Month', days: 30 },
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.label}
                      style={[
                        styles.datePresetButton,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.border
                        }
                      ]}
                      onPress={() => {
                        const newDate = new Date();
                        newDate.setDate(newDate.getDate() + preset.days);
                        setTempSelectedDate(newDate);
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Selected Date Preview */}
              <View style={[styles.datePreview, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.datePreviewLabel, { color: colors.textSecondary }]}>Selected Date:</Text>
                <Text style={[styles.datePreviewValue, { color: colors.text }]}>
                  {tempSelectedDate.toISOString().split('T')[0]}
                </Text>
              </View>
            </View>

            <View style={styles.datePickerFooter}>
              <TouchableOpacity
                style={[styles.datePickerCancelButton, { borderColor: colors.border }]}
                onPress={() => setIsDatePickerVisible(false)}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerConfirmButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const formattedDate = tempSelectedDate.toISOString().split('T')[0];
                  if (selectedDateType === 'start') {
                    setStartDate(formattedDate);
                  } else {
                    setEndDate(formattedDate);
                  }
                  setIsDatePickerVisible(false);
                }}
              >
                <Text style={{ color: theme === 'dark' ? '#000' : '#fff', fontWeight: 'bold' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventsList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  eventCard: {
    width: width * 0.75,
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventImagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
  },
  eventGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  eventContent: {
    marginBottom: 8,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  eventInfo: {
    fontSize: 12,
  },
  priceTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  favoriteButtonCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  popularImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  popularContent: {
    flex: 1,
    marginLeft: 16,
  },
  popularTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  popularText: {
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    height: '70%',
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  priceRangeContainer: {
    marginBottom: 10,
  },
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  priceSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  pricePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pricePresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  priceInputContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateRangeContainer: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
    marginBottom: 20,
  },
  resetButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  applyButton: {
    flex: 2,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorDetails: {
    marginBottom: 20,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
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
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  datePickerModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  datePickerBody: {
    marginBottom: 20,
  },
  datePickerInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  datePickerInputGroup: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  datePickerInput: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  datePresetsContainer: {
    marginBottom: 20,
  },
  datePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  datePresetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  datePreview: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePreviewLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  datePreviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  datePickerFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;
