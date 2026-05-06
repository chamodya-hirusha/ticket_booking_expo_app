import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Ticket, getEventImageUrl, Event as ConstantEvent } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Reservation, StripePayment, PaginatedResponse, Event as ApiEvent } from '../services/api/types';
import * as Sharing from 'expo-sharing';
import { generateTicketPDF } from '../utils/ticketPdfGenerator';
import { toast } from '../services/toast';
import { useCustomToast } from '../context/ToastContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const MyTickets = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, theme } = useTheme();
  const { isAuthenticated, handlePermissionError } = useAuth();
  const customToast = useCustomToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [downloadingTickets, setDownloadingTickets] = useState<Set<string>>(new Set());
  const [sharingTickets, setSharingTickets] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 10;

  // Fetch tickets from API
  const fetchTickets = useCallback(async (showLoading: boolean = true, page: number = currentPage) => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      return;
    }

    if (!isAuthenticated) {
      setTickets([]);
      setLoading(false);
      isFetchingRef.current = false;
      return;
    }

    try {
      isFetchingRef.current = true;
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Fetch user reservations with pagination
      const response = await apiService.reservation.getUserReservations({
        page: page,
        size: PAGE_SIZE,
        sortBy: 'id',
        direction: 'DESC',
      });

      // Handle access denied or permission errors
      if (!response.success) {
        const errorMsg = response.error || response.message || 'Failed to load tickets';
        const responseData = response.data as Record<string, unknown> | undefined;
        const httpStatus = responseData?._status as number | undefined;
        const responseCode = responseData?.code as string | undefined;

        // Check if it's an access denied or session expired error (401, 403, or code "05")
        if (httpStatus === 401 || httpStatus === 403 || responseCode === '05' ||
          errorMsg.toLowerCase().includes('access denied') ||
          errorMsg.toLowerCase().includes('permission') ||
          errorMsg.toLowerCase().includes('forbidden') ||
          errorMsg.toLowerCase().includes('unauthorized') ||
          errorMsg.toLowerCase().includes('invalid token') ||
          errorMsg.toLowerCase().includes('token expired')) {

          // Call permission error handler to refresh user or sign out
          if (handlePermissionError) {
            await handlePermissionError();
          }

          // Set empty tickets but don't show error - show empty state instead
          setTickets([]);
          setTotalPages(0);
          setTotalElements(0);
          setCurrentPage(0);

          return; // Exit gracefully
        }

        // For other errors, show the error
        setError(errorMsg);
        setTickets([]);
        return;
      }

      if (response.success && response.data) {
        let reservationsArray: Reservation[] = [];
        let paginationData: { totalPages: number; totalElements: number; number: number } | null = null;
        const dataObj = response.data;

        // Handle nested response structure (same as events)
        if (Array.isArray(dataObj)) {
          reservationsArray = dataObj;
        } else if (dataObj && typeof dataObj === 'object') {
          // Handle response with 'code' field (alternative API format)
          if ('code' in dataObj && 'content' in dataObj) {
            // Response format: { code: "00", content: PaginatedResponse, message: "..." }
            const paginatedResponse = (dataObj as Record<string, unknown>).content as Record<string, unknown>;
            if (paginatedResponse && typeof paginatedResponse === 'object' && 'content' in paginatedResponse) {
              const nestedContent = paginatedResponse.content;
              if (Array.isArray(nestedContent)) {
                reservationsArray = nestedContent;
                // Extract pagination metadata
                paginationData = {
                  totalPages: (paginatedResponse.totalPages as number) || 0,
                  totalElements: (paginatedResponse.totalElements as number) || 0,
                  number: (paginatedResponse.number as number) || page,
                };
              } else {
                reservationsArray = [];
              }
            } else if (Array.isArray(paginatedResponse)) {
              // content might be directly an array
              reservationsArray = paginatedResponse;
            } else {
              reservationsArray = [];
            }
          }
          // Handle standard PaginatedResponse format
          else if ('content' in dataObj) {
            const dataObjTyped = dataObj as Record<string, unknown>;
            if (Array.isArray(dataObjTyped.content)) {
              // Direct array in content property
              reservationsArray = dataObjTyped.content;
              // Extract pagination metadata if available
              if ('totalPages' in dataObjTyped) {
                paginationData = {
                  totalPages: (dataObjTyped.totalPages as number) || 0,
                  totalElements: (dataObjTyped.totalElements as number) || 0,
                  number: (dataObjTyped.number as number) || page,
                };
              }
            } else if (dataObjTyped.content === null || dataObjTyped.content === undefined) {
              reservationsArray = [];
            } else if (dataObjTyped.content && typeof dataObjTyped.content === 'object' && 'content' in (dataObjTyped.content as object)) {
              // Nested structure: response.data.content.content (PaginatedResponse wrapper)
              const contentWrapper = dataObjTyped.content as Record<string, unknown>;
              const nestedContent = contentWrapper.content;
              if (Array.isArray(nestedContent)) {
                reservationsArray = nestedContent;
                // Extract pagination metadata from parent
                paginationData = {
                  totalPages: (contentWrapper.totalPages as number) || (dataObjTyped.totalPages as number) || 0,
                  totalElements: (contentWrapper.totalElements as number) || (dataObjTyped.totalElements as number) || 0,
                  number: (contentWrapper.number as number) || (dataObjTyped.number as number) || page,
                };
              } else {
                reservationsArray = [];
              }
            } else {
              reservationsArray = [];
            }
          } else {
            reservationsArray = [];
          }
        }

        // Update pagination state
        if (paginationData) {
          setTotalPages(paginationData.totalPages || 0);
          setTotalElements(paginationData.totalElements || 0);
          setCurrentPage(paginationData.number || page);
        } else {
          // Fallback: estimate pagination from array length
          if (reservationsArray.length === PAGE_SIZE) {
            // If we got a full page, there might be more
            setTotalPages(Math.max(1, currentPage + 2));
          } else {
            // Last page
            setTotalPages(currentPage + 1);
          }
          setTotalElements((currentPage * PAGE_SIZE) + reservationsArray.length);
        }

        // Fetch user payments to match with reservations
        let successfulPaymentReservationIds: Set<number> = new Set();
        try {
          const paymentsResponse = await apiService.payment.getUserPayments();

          // Handle access denied errors for payments
          if (!paymentsResponse.success) {
            const errorMsg = paymentsResponse.error || paymentsResponse.message || '';

            if (errorMsg.toLowerCase().includes('access denied') ||
              errorMsg.toLowerCase().includes('permission') ||
              errorMsg.toLowerCase().includes('unauthorized')) {
              // Continue without payment filtering - show all reservations
            } else {
              // Continue despite errors to show reservations
            }
          } else if (paymentsResponse.success && paymentsResponse.data) {
            let paymentsArray: StripePayment[] = [];
            const dataObj = paymentsResponse.data;

            // Handle different response structures
            if (Array.isArray(dataObj)) {
              paymentsArray = dataObj;
            } else if (dataObj && typeof dataObj === 'object') {
              if ('code' in dataObj && 'content' in dataObj) {
                const content = dataObj.content;
                if (Array.isArray(content)) {
                  paymentsArray = content;
                } else if (content && typeof content === 'object' && 'content' in (content as object)) {
                  const nestedContent = (content as Record<string, unknown>).content;
                  if (Array.isArray(nestedContent)) {
                    paymentsArray = nestedContent;
                  }
                }
              } else if ('content' in (dataObj as object)) {
                const content = (dataObj as Record<string, unknown>).content;
                if (Array.isArray(content)) {
                  paymentsArray = content;
                } else if (content && typeof content === 'object' && 'content' in (content as object)) {
                  const nestedContent = (content as Record<string, unknown>).content;
                  if (Array.isArray(nestedContent)) {
                    paymentsArray = nestedContent;
                  }
                }
              }
            }

            // Filter payments with SUCCESS status and collect reservation IDs
            paymentsArray.forEach((payment) => {
              const rawStatus = payment.status || payment.paymentStatus || '';
              const paymentStatus = String(rawStatus).toUpperCase().trim();

              if (paymentStatus === 'SUCCESS' || paymentStatus === 'COMPLETED' || paymentStatus === 'CONFIRMED') {
                const reservationId = payment.reservationId || payment.reservation?.id;
                if (reservationId) {
                  successfulPaymentReservationIds.add(Number(reservationId));
                }
              }
            });

          }
        } catch (payErr) {
          // Continue without payment filtering if there's an exception
        }

        // Filter reservations to only include those with SUCCESS payment status
        const reservationsWithSuccessPayment = reservationsArray.filter((reservation) => {
          // Check if reservation ID is in the successful payments set
          if (successfulPaymentReservationIds.has(Number(reservation.id))) {
            return true;
          }

          // Also check if payment status is directly in reservation
          const paymentStatus = reservation.paymentStatus ||
            reservation.payment?.status ||
            reservation.payment?.paymentStatus;

          if (paymentStatus) {
            const status = String(paymentStatus).toUpperCase().trim();
            // Be more inclusive with status codes to ensure users see their tickets
            return ['SUCCESS', 'COMPLETED', 'CONFIRMED', 'PAID', 'AUTHORIZED', 'PENDING'].includes(status);
          }

          // If no payment status field, fallback to reservation status if confirmed
          const reservationStatus = String(reservation.reservationStatus || reservation.status || '').toUpperCase();
          if (reservationStatus === 'CONFIRMED' || reservationStatus === 'COMPLETED') {
            return true;
          }
        });

        // Fetch event details for each reservation and map to tickets
        const ticketsPromises = reservationsWithSuccessPayment.map(async (reservation) => {
          try {
            // Check if eventDetails is already included in reservation (from API)
            let event = reservation.eventDetails || null;

            // If eventDetails not included, fetch it separately
            if (!event && reservation.eventId) {
              const eventResponse = await apiService.event.getPublicEvent(reservation.eventId);

              if (eventResponse.success && eventResponse.data) {
                const responseData = eventResponse.data;

                // Handle different response structures (same as EventDetails screen)
                const anyData = responseData as unknown as Record<string, unknown>;
                if (anyData?.content && typeof anyData.content === 'object') {
                  // Response has nested content structure
                  event = anyData.content as ApiEvent;
                } else if (anyData?.id) {
                  // Event is directly in response.data
                  event = responseData as ApiEvent;
                } else {
                  // Try to find event data anywhere in the response
                  event = responseData as ApiEvent;
                }
              }
            }

            // Map reservation status to ticket status
            // API returns 'reservationStatus' but code might use 'status'
            const reservationStatus = reservation.reservationStatus || reservation.status || 'PENDING';
            let ticketStatus: Ticket['status'] = 'Active';

            if (reservationStatus === 'CANCELLED' || reservationStatus === 'FAILED') {
              ticketStatus = 'Expired';
            } else if (reservationStatus === 'COMPLETED' || reservation.isCheckedIn) {
              ticketStatus = 'Used';
            } else if (reservationStatus === 'CONFIRMED' || reservationStatus === 'PENDING') {
              ticketStatus = 'Active';
            }

            // Determine ticket tier from ticketType
            const ticketType = reservation.ticketType || 'GENERAL';
            const tier = ticketType === 'VIP' ? 'VIP' : ticketType === 'PREMIUM' ? 'Premium' : 'General';

            // Format date from event or reservation
            let formattedDate = 'TBD';
            if (event?.date) {
              try {
                formattedDate = new Date(event.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
              } catch {
                formattedDate = event.date;
              }
            } else if (reservation.reservationDate) {
              try {
                formattedDate = new Date(reservation.reservationDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
              } catch {
                formattedDate = reservation.reservationDate;
              }
            }

            // Extract event name from various possible fields
            const eventName = event?.name ||
              (event as any)?.eventName ||
              reservation.eventDetails?.name ||
              reservation.eventDetails?.eventName ||
              `Event #${reservation.eventId}`;

            // Extract location from various possible fields
            const eventLocation = event?.location ||
              (event as any)?.eventLocation ||
              reservation.eventDetails?.location ||
              reservation.eventDetails?.eventLocation ||
              'TBD';

            // Extract image from various possible formats
            const eventImage = event?.imageUrl ||
              event?.image_url ||
              event?.image ||
              reservation.eventDetails?.imageUrl ||
              reservation.eventDetails?.image_url ||
              reservation.eventDetails?.image ||
              null;

            // Ensure qrCode is properly set (qrToken from reservation)
            const qrCodeValue = reservation.qrToken ||
              reservation.qrCode ||
              reservation.qr_token ||
              undefined;

            // Extract seat information from reservation
            // Check multiple possible field names for seat data
            const seatValue = reservation.seat ||
              reservation.seatNumber ||
              reservation.seat_number ||
              reservation.seatInfo ||
              reservation.seat_info ||
              reservation.section ||
              undefined;

            // If no seat info, generate a default based on ticket tier
            let formattedSeat = seatValue;
            if (!formattedSeat) {
              // Generate a default seat format based on tier
              const sectionMap: { [key: string]: string } = {
                'VIP': 'BLOCK A',
                'Premium': 'BLOCK B',
                'General': 'BLOCK C'
              };
              const section = sectionMap[tier] || 'BLOCK C';
              // Use reservation ID to generate consistent seat numbers
              const rowNum = (reservation.id % 20) + 1;
              const seatNum = (reservation.id % 50) + 1;
              formattedSeat = `${section} / ROW ${rowNum} / SEAT ${seatNum}`;
            }

            const ticket: Ticket = {
              id: String(reservation.id),
              eventId: String(reservation.eventId),
              eventTitle: eventName,
              status: ticketStatus,
              tier: tier,
              date: formattedDate,
              location: eventLocation,
              image: eventImage,
              qrCode: qrCodeValue,
              seat: formattedSeat,
            };

            return ticket;
          } catch (err: unknown) {
            // Return a ticket with minimal info if processing fails
            const error = err as Error;
            return {
              id: String(reservation.id),
              eventId: String(reservation.eventId),
              eventTitle: `Event #${reservation.eventId}`,
              status: 'Active' as Ticket['status'],
              tier: reservation.ticketType === 'VIP' ? 'VIP' : reservation.ticketType === 'PREMIUM' ? 'Premium' : 'General',
              date: 'TBD',
              location: 'TBD',
              image: null,
            } as Ticket;
          }
        });

        const mappedTickets = await Promise.all(ticketsPromises);
        // Filter out null values
        const validTickets = mappedTickets.filter(t => t !== null && t !== undefined);

        setTickets(validTickets);
      } else {
        const errorMsg = response.error || response.message || 'Failed to load tickets';
        setError(errorMsg);
        setTickets([]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      const errorMessage = error.message || 'Network error. Please check your connection.';
      setError(errorMessage);
      setTickets([]);
    } finally {
      isFetchingRef.current = false;
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [isAuthenticated, currentPage]);

  useEffect(() => {
    // Only fetch if authenticated and not already fetching
    if (isAuthenticated && !isFetchingRef.current) {
      fetchTickets();
    } else if (!isAuthenticated) {
      // Clear tickets if not authenticated
      setTickets([]);
      setLoading(false);
    }
  }, [isAuthenticated, fetchTickets]);

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(0);
    fetchTickets(false, 0);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      fetchTickets(true, newPage);
    }
  };

  // Download ticket as PDF directly to gallery
  const handleDownloadPDF = async (ticket: Ticket) => {
    if (!ticket.qrCode) {
      customToast.error('QR code is not available for this ticket.');
      return;
    }

    if (downloadingTickets.has(ticket.id)) {
      return; // Already downloading
    }

    try {
      setDownloadingTickets(prev => new Set(prev).add(ticket.id));

      const result = await generateTicketPDF(ticket, { directDownload: true });

      if (result.success) {
        const locationMessage = Platform.OS === 'android'
          ? (result.savedToDownloads ? 'Downloads folder (via save dialog)' : 'App Documents folder')
          : (result.savedToDownloads ? 'Files app / Ticket PDFs album' : 'App Documents folder');

        customToast.success(
          `Your ticket PDF has been saved to your device.\n\nEvent: ${ticket.eventTitle}\nFile: ${result.fileName}`,
          'PDF Downloaded Successfully! ✅'
        );
      } else {
        customToast.error(
          result.error || 'Failed to download ticket PDF. Please check your internet connection and try again.',
          'PDF Download Failed'
        );
      }
    } catch (err: unknown) {
      const error = err as Error;
      customToast.error(
        error.message || 'Failed to download ticket PDF. Please try again.',
        'PDF Download Failed'
      );
    } finally {
      setDownloadingTickets(prev => {
        const newSet = new Set(prev);
        newSet.delete(ticket.id);
        return newSet;
      });
    }
  };

  // Share ticket as PDF
  const handleSharePDF = async (ticket: Ticket) => {
    if (!ticket.qrCode) {
      customToast.error('QR code is not available for this ticket.');
      return;
    }

    if (sharingTickets.has(ticket.id)) {
      return; // Already sharing
    }

    try {
      setSharingTickets(prev => new Set(prev).add(ticket.id));

      const result = await generateTicketPDF(ticket, { share: true });

      if (result.success) {
        // Sharing dialog is handled by the utility function
        // No alert needed - share dialog is already shown
        // Sharing dialog is handled by the utility function
        // No alert needed - share dialog is already shown
      } else {
        // Show error if PDF generation or sharing failed
        customToast.error(
          result.error || 'Failed to generate or share ticket PDF. Please check your internet connection and try again.',
          'Share Failed'
        );
      }
    } catch (err: unknown) {
      const error = err as Error;
      customToast.error(
        error.message || 'Failed to generate ticket PDF. Please try again.',
        'PDF Generation Failed'
      );
    } finally {
      setSharingTickets(prev => {
        const newSet = new Set(prev);
        newSet.delete(ticket.id);
        return newSet;
      });
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const isFirstPage = currentPage === 0;
    const isLastPage = currentPage >= totalPages - 1;

    // Calculate which pages to show
    const getVisiblePages = () => {
      const pages: number[] = [];
      const maxVisible = 5;

      if (totalPages <= maxVisible) {
        // Show all pages if 5 or fewer
        for (let i = 0; i < totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Smart pagination logic
        if (currentPage < 3) {
          // Near start: show first pages
          for (let i = 0; i < maxVisible; i++) {
            pages.push(i);
          }
        } else if (currentPage > totalPages - 4) {
          // Near end: show last pages
          for (let i = totalPages - maxVisible; i < totalPages; i++) {
            pages.push(i);
          }
        } else {
          // Middle: show current page ± 2
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
        <View style={[styles.paginationControls, { backgroundColor: theme === 'dark' ? colors.surface : '#ffffff' }]}>
          {/* First Page Button */}
          {showFirstPage && (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.paginationTextButton,
                  pressed && { backgroundColor: colors.primary + '20', opacity: 0.8 }
                ]}
                onPress={() => handlePageChange(0)}
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
              isFirstPage && { opacity: 0.4 }
            ]}
            onPress={() => handlePageChange(currentPage - 1)}
            disabled={isFirstPage}
          >
            <MaterialIcons
              name="chevron-left"
              size={18}
              color={isFirstPage ? colors.textSecondary : colors.textSecondary}
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
                    onPress={() => handlePageChange(pageNum)}
                  >
                    <Text
                      style={[
                        styles.pageNumberTextActive,
                        {
                          color: theme === 'dark' ? '#000' : '#fff',
                        }
                      ]}
                    >
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
                    onPress={() => handlePageChange(pageNum)}
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
              isLastPage && { opacity: 0.4 }
            ]}
            onPress={() => handlePageChange(currentPage + 1)}
            disabled={isLastPage}
          >
            <MaterialIcons
              name="chevron-right"
              size={18}
              color={isLastPage ? colors.textSecondary : colors.textSecondary}
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
                onPress={() => handlePageChange(totalPages - 1)}
              >
                <Text style={[styles.paginationInactiveText, { color: colors.textSecondary }]}>{totalPages}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderTicket = ({ item }: { item: Ticket }) => (
    <TouchableOpacity
      style={[
        styles.ticketCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        item.status === 'Used' && styles.ticketUsed
      ]}
      onPress={() => {
        if (item.status === 'Used') {
          navigation.navigate('InvalidTicket');
        } else {
          navigation.navigate('TicketDetail', { ticket: item });
        }
      }}
      activeOpacity={0.9}
    >
      {item.status === 'Active' && (
        <View style={[styles.activeIndicator, { backgroundColor: colors.primary, shadowColor: colors.primary }]} />
      )}

      <View style={styles.ticketContent}>
        <Image source={{ uri: getEventImageUrl(item.image) }} style={styles.ticketImage} />

        <View style={styles.ticketInfo}>
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>{item.eventTitle}</Text>
          <Text style={[styles.ticketTier, { color: colors.textSecondary }]}>{item.tier}</Text>
        </View>

        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            item.status === 'Active'
              ? { backgroundColor: 'rgba(0, 255, 255, 0.2)', borderColor: colors.primary }
              : { backgroundColor: colors.inputBackground }
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'Active' ? { color: colors.primary } : { color: colors.textSecondary }
            ]}>{item.status}</Text>
          </View>
        </View>
      </View>

      {/* Dotted Line */}
      <View style={styles.dottedLineContainer}>
        <View style={[styles.notchLeft, { backgroundColor: colors.background }]} />
        <View style={[styles.dottedLine, { borderColor: colors.border }]} />
        <View style={[styles.notchRight, { backgroundColor: colors.background }]} />
      </View>

      <View style={styles.ticketFooter}>
        <View style={styles.footerItem}>
          <MaterialIcons name="calendar-today" size={16} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>{item.date}</Text>
        </View>
        <View style={styles.footerItem}>
          <MaterialIcons name="location-on" size={16} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>{item.location}</Text>
        </View>
        <View style={styles.footerActions}>
          {downloadingTickets.has(item.id) ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.footerActionButton} />
          ) : (
            <TouchableOpacity
              style={styles.footerActionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDownloadPDF(item);
              }}
              disabled={item.status === 'Used' || !item.qrCode}
            >
              <MaterialIcons
                name="download"
                size={16}
                color={item.status === 'Used' || !item.qrCode ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>
          )}
          {sharingTickets.has(item.id) ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.footerActionButton} />
          ) : (
            <TouchableOpacity
              style={styles.footerActionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleSharePDF(item);
              }}
              disabled={item.status === 'Used' || !item.qrCode}
            >
              <MaterialIcons
                name="share"
                size={16}
                color={item.status === 'Used' || !item.qrCode ? colors.textSecondary : colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Tickets</Text>
        <TouchableOpacity style={[styles.searchButton, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="search" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading tickets...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.error || '#ff4444'} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => fetchTickets()}
          >
            <Text style={[styles.retryButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="credit-card" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tickets found</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {!isAuthenticated
              ? 'Please sign in to view your tickets'
              : 'You haven\'t purchased any tickets yet.\nComplete a booking to see your tickets here.'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary, marginTop: 20 }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
          >
            <Text style={[styles.retryButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>Discover Events</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderPagination()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 20,
    paddingBottom: 110, // space for pagination + bottom tab bar (70px height + 20px bottom offset + 20px padding)
  },
  ticketCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  ticketUsed: {
    opacity: 0.6,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 5,
  },
  ticketContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  ticketImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 16,
  },
  ticketInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ticketTier: {
    fontSize: 14,
  },
  statusContainer: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dottedLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    overflow: 'hidden',
  },
  notchLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
  },
  dottedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginHorizontal: 10,
  },
  notchRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: -10,
  },
  ticketFooter: {
    padding: 16,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flex: 1,
    minWidth: '45%',
  },
  footerText: {
    fontSize: 14,
    marginLeft: 8,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  footerActionButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  paginationContainer: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 0,
    gap: 16,
    borderRadius: 12,
  },
  paginationInfo: {
    alignItems: 'center',
    marginBottom: 4,
  },
  paginationInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  paginationText: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
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
    gap: 4,
    alignItems: 'center',
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
    fontWeight: '400',
  },
});

export default MyTickets;