import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  Share,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { Event, getEventImageUrl } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';
import { transformEvent, formatPrice, getEventPriceDisplay } from '../utils/event';

type EventDetailsRouteProp = RouteProp<{ EventDetails: { event: Event } }, 'EventDetails'>;

const { width, height } = Dimensions.get('window');

const EventDetails = () => {
  const navigation = useNavigation();
  const route = useRoute<EventDetailsRouteProp>();
  const { event: initialEvent } = route.params;
  const { colors, theme } = useTheme();
  const { toggleFavorite, isFavorite } = useFavorites();

  const [event, setEvent] = useState<Event>(initialEvent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update favorite status when event changes
  const isEventFavorite = isFavorite(event.id)

  // Format date and time
  const formatDateTime = (date: string, startTime?: string): { date: string; time: string } => {
    if (!date) return { date: 'TBA', time: 'TBA' };
    try {
      const dateObj = new Date(date);
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      const formattedDate = dateObj.toLocaleDateString('en-US', options);

      if (startTime) {
        // Format time (assuming HH:mm format)
        const timeParts = startTime.split(':');
        if (timeParts.length >= 2) {
          const hours = parseInt(timeParts[0]);
          const minutes = timeParts[1];
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          return { date: formattedDate, time: `${displayHours}:${minutes} ${ampm}` };
        }
      }
      return { date: formattedDate, time: startTime || 'TBA' };
    } catch (e) {
      return { date: date, time: startTime || 'TBA' };
    }
  };

  // Get price for display
  const getMinPrice = () => {
    return getEventPriceDisplay(event);
  };

  // Load event details
  useEffect(() => {
    const loadEventDetails = async () => {
      const eventId = event?.id || (event as any)?.id?.toString() || String((event as any)?.id);

      if (!eventId || eventId === 'undefined' || eventId === 'null' || eventId === 'NaN' || eventId === '') {
        if (__DEV__) {
          console.warn('[EventDetails] Invalid or missing event ID:', {
            eventId,
            eventObject: event,
            eventKeys: event ? Object.keys(event) : [],
            hasId: !!(event as any)?.id,
            idValue: (event as any)?.id,
            idType: typeof (event as any)?.id,
          });
        }
        setLoading(false);
        if (!event?.name) {
          setError('Event ID is missing. Cannot load event details.');
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await apiService.event.getPublicEvent(eventId);

        if (response.success && response.data) {
          const responseData = response.data as any;

          let eventData: any;

          if (responseData?.content && typeof responseData.content === 'object') {
            eventData = responseData.content;
          } else if (responseData?.id) {
            eventData = responseData;
          } else {
            eventData = responseData;
          }

          // Transform event data using utility
          const transformedEvent = transformEvent(eventData, eventId);

          setEvent(transformedEvent);
        } else {
          setError(response.error || 'Failed to load event details');

        }
      } catch (err: any) {
        const errorMessage = err?.message || 'An error occurred while loading event details';
      } finally {
        setLoading(false);
      }
    };

    loadEventDetails();
  }, [event?.id]);

  const dateTime = formatDateTime(event.date, event.startTime);

  const handleBook = () => {
    (navigation as any).navigate('TicketSelection', { event });
  };

  const handleToggleFavorite = () => {
    toggleFavorite(event);
  };

  const handleShare = async () => {
    try {
      const eventUrl = getEventImageUrl(event.image);
      const shareMessage = `Check out this event: ${event.name}\n\n` +
        `Date: ${dateTime.date} at ${dateTime.time}\n` +
        `Location: ${event.location || 'TBA'}\n` +
        `Price: ${getMinPrice()}\n\n` +
        (event.description ? `${event.description.substring(0, 100)}...\n\n` : '') +
        `Get your tickets now!`;

      const result = await Share.share({
        message: shareMessage,
        title: `Share: ${event.name}`,
        ...(Platform.OS === 'ios' && eventUrl ? { url: eventUrl } : {}),
      });

      // Share action completed (success or dismissed)
    } catch (error: any) {
      Alert.alert(
        'Share Failed',
        error.message || 'Failed to share event. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Loading event details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.headerActions} edges={['top']}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(15,23,42,0.06)' }]}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text
            style={{
              color: colors.text,
              marginTop: 16,
              fontSize: 16,
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={[
              styles.bookButton,
              {
                marginTop: 20,
                width: 200,
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text
              style={[
                styles.bookButtonText,
                { color: theme === 'dark' ? '#000' : '#fff' },
              ]}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero Image Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: getEventImageUrl(event.image) }}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
            onError={(error) => {
              if (__DEV__) {
                console.warn('[EventDetails] Failed to load event image:', {
                  eventId: event.id,
                  eventName: event.name,
                  imageUrl: event.image,
                  fullUrl: getEventImageUrl(event.image),
                  error: error,
                });
              }
            }}
          />

          {/* Gradient Overlay for Fade Effect */}
          <LinearGradient
            colors={
              theme === 'dark'
                ? ['rgba(5,5,5,0)', 'rgba(5,5,5,0.8)', '#050505']
                : ['rgba(248,249,250,0)', 'rgba(248,249,250,0.9)', colors.background]
            }
            style={styles.gradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          {/* Header Actions */}
          <SafeAreaView style={styles.headerActions} edges={['top']}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.10)' : 'rgba(15,23,42,0.06)' },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={24} color={theme === 'dark' ? '#fff' : colors.text} />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(15,23,42,0.06)' },
                ]}
                onPress={handleToggleFavorite}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isEventFavorite ? "heart" : "heart-outline"}
                  size={24}
                  color={isEventFavorite
                    ? (theme === 'dark' ? '#ff00aa' : colors.notification || '#ec4899')
                    : (theme === 'dark' ? '#fff' : colors.primary)
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(15,23,42,0.06)' },
                ]}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Feather name="share-2" size={24} color={theme === 'dark' ? '#fff' : colors.primary} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>
            {event.name?.toUpperCase() || 'FESTIVAL'}
          </Text>

          {/* Info Grid */}
          <View style={styles.gridContainer}>
            {/* Date & Time */}
            <View
              style={[
                styles.gridItem,
                {
                  backgroundColor: theme === 'dark' ? '#111' : colors.surface,
                  borderColor: theme === 'dark' ? '#222' : colors.border,
                },
              ]}
            >
              <View style={styles.gridIconContainer}>
                <Feather name="calendar" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>
                  Date & Time
                </Text>
                <Text style={[styles.gridValue, { color: colors.text }]}>{dateTime.date}</Text>
                <Text style={[styles.gridValue, { color: colors.text }]}>{dateTime.time}</Text>
              </View>
            </View>

            {/* Location */}
            <View
              style={[
                styles.gridItem,
                {
                  backgroundColor: theme === 'dark' ? '#111' : colors.surface,
                  borderColor: theme === 'dark' ? '#222' : colors.border,
                },
              ]}
            >
              <View style={styles.gridIconContainer}>
                <Feather name="map-pin" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>
                  Location
                </Text>
                <Text
                  style={[styles.gridValue, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {event.location || 'TBA'}
                </Text>
              </View>
            </View>

            {/* Price */}
            <View
              style={[
                styles.gridItem,
                {
                  backgroundColor: theme === 'dark' ? '#111' : colors.surface,
                  borderColor: theme === 'dark' ? '#222' : colors.border,
                },
              ]}
            >
              <View style={styles.gridIconContainer}>
                <Feather name="tag" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>
                  Price
                </Text>
                <Text style={[styles.gridValue, { color: colors.text }]}>{getMinPrice()}</Text>
              </View>
            </View>

            {/* Organizer */}
            <View
              style={[
                styles.gridItem,
                {
                  backgroundColor: theme === 'dark' ? '#111' : colors.surface,
                  borderColor: theme === 'dark' ? '#222' : colors.border,
                },
              ]}
            >
              <View style={styles.gridIconContainer}>
                <Feather name="user" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>
                  Category
                </Text>
                <Text style={[styles.gridValue, { color: colors.text }]}>
                  {event.eventCategory || 'General'}
                </Text>
                <Text
                  style={[
                    styles.gridValue,
                    {
                      fontSize: 12,
                      color: theme === 'dark' ? '#888' : colors.textSecondary,
                    },
                  ]}
                >
                  {event.eventStatus || 'Scheduled'}
                </Text>
              </View>
            </View>
          </View>

          {/* About Section */}
          <View
            style={[
              styles.aboutSection,
              {
                backgroundColor: theme === 'dark' ? '#111' : colors.surface,
                borderColor: theme === 'dark' ? '#222' : colors.border,
              },
            ]}
          >
            <Text style={[styles.aboutTitle, { color: colors.text }]}>
              About the Event
            </Text>
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              {event.description || 'No description available for this event.'}
            </Text>
          </View>

          {/* Ticket Information */}
          {event.ticketTypes && event.ticketTypes.length > 0 && (
            <View style={styles.pricingSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Ticket Categories
              </Text>
              <View style={styles.pricingCardsContainer}>
                {event.ticketTypes.map((tt, index) => {
                  const nameUpper = tt.name.toUpperCase();
                  let color = '#94a3b8';
                  let icon = 'ticket' as any;
                  let badgeBg = 'rgba(148, 163, 184, 0.2)';
                  let gradientColors: [string, string, ...string[]] = ['rgba(148, 163, 184, 0.1)', 'transparent'];
                  let statusText = 'Standard Entry';

                  if (nameUpper.includes('VIP')) {
                    color = '#ffd700';
                    icon = 'star';
                    badgeBg = 'rgba(255, 215, 0, 0.2)';
                    gradientColors = ['rgba(255, 215, 0, 0.15)', 'transparent'];
                    statusText = 'Premium Experience';
                  } else if (nameUpper.includes('PREMIUM')) {
                    color = colors.primary;
                    icon = 'diamond';
                    badgeBg = 'rgba(0, 255, 255, 0.15)';
                    gradientColors = ['rgba(0, 255, 255, 0.1)', 'transparent'];
                    statusText = 'Priority Access';
                  }

                  return (
                    <View
                      key={`${tt.id}-${index}`}
                      style={[
                        styles.priceCard,
                        {
                          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8fafc',
                          borderColor: theme === 'dark' ? '#333' : '#e2e8f0',
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={gradientColors}
                        style={styles.cardGradient}
                      />
                      <View style={styles.priceCardHeader}>
                        <View style={[styles.tierBadge, { backgroundColor: badgeBg }]}>
                          <Ionicons name={icon} size={14} color={color} />
                        </View>
                        <Text style={[styles.tierName, { color: colors.text }]}>{tt.name}</Text>
                      </View>
                      <Text style={[styles.tierPrice, { color: colors.primary }]}>
                        {formatPrice(tt.price)}
                      </Text>
                      <View style={styles.tierStatus}>
                        <View style={[styles.statusDot, { backgroundColor: color }]} />
                        <Text style={[styles.statusText, { color: colors.textSecondary }]}>{statusText}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Footer Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.bookButton,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
          onPress={handleBook}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.bookButtonText,
              { color: theme === 'dark' ? '#000' : '#fff' },
            ]}
          >
            Book Ticket
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    height: height * 0.5,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  headerActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    marginTop: -40,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 30,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 30,
  },
  gridItem: {
    width: (width - 52) / 2,
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
    minHeight: 100,
    justifyContent: 'space-between',
  },
  gridIconContainer: {
    marginBottom: 12,
  },
  gridLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  gridValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  aboutSection: {
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 20,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  aboutText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 22,
  },
  ticketInfo: {
    gap: 12,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  ticketType: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ticketPrice: {
    color: '#00ffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#050505',
  },
  bookButton: {
    backgroundColor: '#FF00FF',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF00FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 5,
  },
  bookButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  pricingSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pricingCardsContainer: {
    gap: 12,
  },
  priceCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 120,
    justifyContent: 'center',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  priceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  tierBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierName: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  tierPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tierStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default EventDetails;