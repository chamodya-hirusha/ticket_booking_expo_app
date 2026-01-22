import React, { useEffect, useRef, useState } from 'react';
import {
   View,
   Text,
   StyleSheet,
   TouchableOpacity,
   Animated,
   Dimensions,
   Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Event } from '../constants';
import { Reservation, StripePaymentResponse } from '../services/api/types';
import { notificationService } from '../services/notifications';
import { formatPrice } from '../utils/event';
import { apiService } from '../services/api';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type PaymentSuccessRouteProp = RouteProp<{
   PaymentSuccess: {
      event: Event;
      reservation: Reservation;
      payment: StripePaymentResponse;
      ticketDetails: {
         type: string;
         quantity: number;
         price: number;
      };
      total: number;
   }
}, 'PaymentSuccess'>;

// Firework Particle Component
interface ParticleProps {
   x: number;
   y: number;
   angle: number;
   distance: number;
   color: string;
   delay: number;
   onComplete: () => void;
}

const FireworkParticle: React.FC<ParticleProps> = ({ x, y, angle, distance, color, delay, onComplete }) => {
   const translateX = useRef(new Animated.Value(0)).current;
   const translateY = useRef(new Animated.Value(0)).current;
   const opacity = useRef(new Animated.Value(1)).current;
   const scale = useRef(new Animated.Value(1)).current;

   useEffect(() => {
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance;

      Animated.parallel([
         Animated.timing(translateX, {
            toValue: endX,
            duration: 1500,
            delay: delay,
            useNativeDriver: true,
         }),
         Animated.timing(translateY, {
            toValue: endY,
            duration: 1500,
            delay: delay,
            useNativeDriver: true,
         }),
         Animated.timing(opacity, {
            toValue: 0,
            duration: 1500,
            delay: delay,
            useNativeDriver: true,
         }),
         Animated.sequence([
            Animated.timing(scale, {
               toValue: 1.5,
               duration: 200,
               delay: delay,
               useNativeDriver: true,
            }),
            Animated.timing(scale, {
               toValue: 0,
               duration: 1300,
               useNativeDriver: true,
            }),
         ]),
      ]).start(() => {
         onComplete();
      });
   }, []);

   return (
      <Animated.View
         style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            transform: [
               { translateX },
               { translateY },
               { scale },
            ],
            opacity,
         }}
      />
   );
};

// Firework Burst Component
interface FireworkBurstProps {
   x: number;
   y: number;
   colors: string[];
   onComplete: () => void;
}

const FireworkBurst: React.FC<FireworkBurstProps> = ({ x, y, colors, onComplete }) => {
   const [particles, setParticles] = useState<Array<{ id: number; angle: number; color: string; delay: number; distance: number }>>([]);
   const completedCount = useRef(0);
   const particleCount = 30;

   useEffect(() => {
      // Create particles with random angles
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
         id: i,
         angle: (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3,
         color: colors[Math.floor(Math.random() * colors.length)],
         delay: Math.random() * 100,
         distance: 80 + Math.random() * 60,
      }));
      setParticles(newParticles);
   }, [colors]);

   const handleParticleComplete = () => {
      completedCount.current += 1;
      if (completedCount.current >= particleCount) {
         onComplete();
      }
   };

   return (
      <>
         {particles.map((particle) => (
            <FireworkParticle
               key={particle.id}
               x={x}
               y={y}
               angle={particle.angle}
               distance={particle.distance}
               color={particle.color}
               delay={particle.delay}
               onComplete={handleParticleComplete}
            />
         ))}
      </>
   );
};

const PaymentSuccess = () => {
   const navigation = useNavigation();
   const route = useRoute<PaymentSuccessRouteProp>();
   const { colors, theme } = useTheme();
   const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; colors: string[] }>>([]);
   const completedFireworks = useRef(0);
   const hasAnimated = useRef(false);
   const titleOpacity = useRef(new Animated.Value(0)).current;
   const titleScale = useRef(new Animated.Value(0.5)).current;
   const successTextOpacity = useRef(new Animated.Value(0)).current;

   // Get data from route params or use defaults
   const event = route.params?.event;
   const reservation = route.params?.reservation;
   const payment = route.params?.payment;
   const ticketDetails = route.params?.ticketDetails || { type: 'General', quantity: 2, price: 75 };
   const total = route.params?.total || 210;

   // State for tracking verification
   const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending');
   const [retryCount, setRetryCount] = useState(0);
   const maxRetries = 3;

   // Verify payment status and save ticket data to database
   useEffect(() => {
      const verifyAndSaveTicketData = async () => {
         if (!payment || (!payment.intentId && !payment.id)) {
            setVerificationStatus('failed');
            return;
         }

         try {
            // Extract intentId from payment
            const intentId = payment.intentId || payment.id;

            if (!intentId) {
               Alert.alert('Error', 'No intentId found in payment object');
               return;
            }

            // Step 1: Verify payment with backend (this updates payment status to SUCCESS)
            const verifyResponse = await apiService.payment.verifyPayment(intentId);

            if (verifyResponse.success) {
               setVerificationStatus('verified');

               // Step 2: Double-check reservation status by fetching it
               if (reservation?.id) {
                  try {
                     const reservationResponse = await apiService.reservation.getReservationById(reservation.id);
                     if (reservationResponse.success && reservationResponse.data) {
                        // Reservation confirmed in database
                     }
                  } catch (err) {
                     // Could not fetch reservation details
                  }
               }

               // Ticket data successfully saved to database
            } else {
               // Verification failed - this could be a network issue or database problem

               // Retry logic for transient errors
               if (retryCount < maxRetries) {
                  setTimeout(() => {
                     setRetryCount(prev => prev + 1);
                  }, 2000);
               } else {
                  setVerificationStatus('failed');
               }
            }
         } catch (error: any) {

            // Retry logic for network errors
            if (retryCount < maxRetries) {
               setTimeout(() => {
                  setRetryCount(prev => prev + 1);
               }, 2000);
            } else {
               setVerificationStatus('failed');
            }
         }
      };

      verifyAndSaveTicketData();
   }, [payment, reservation, event, ticketDetails, retryCount]);

   // Initialize fireworks animation (only once)
   useEffect(() => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;

      // Animate title and success text
      Animated.parallel([
         Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 800,
            delay: 300,
            useNativeDriver: true,
         }),
         Animated.spring(titleScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            delay: 300,
            useNativeDriver: true,
         }),
         Animated.timing(successTextOpacity, {
            toValue: 1,
            duration: 600,
            delay: 600,
            useNativeDriver: true,
         }),
      ]).start();

      // Define firework colors based on theme
      const fireworkColors = [
         colors.primary,
         '#FFD700', // Gold
         '#FF6B6B', // Red
         '#4ECDC4', // Cyan
         '#95E1D3', // Mint
         '#F38181', // Pink
         '#AA96DA', // Purple
      ];

      // Create multiple firework bursts at different positions
      const fireworkPositions = [
         { x: SCREEN_WIDTH * 0.3, y: SCREEN_HEIGHT * 0.2 },
         { x: SCREEN_WIDTH * 0.7, y: SCREEN_HEIGHT * 0.25 },
         { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.15 },
         { x: SCREEN_WIDTH * 0.2, y: SCREEN_HEIGHT * 0.3 },
         { x: SCREEN_WIDTH * 0.8, y: SCREEN_HEIGHT * 0.3 },
      ];

      // Stagger the fireworks
      fireworkPositions.forEach((pos, index) => {
         setTimeout(() => {
            setFireworks((prev) => [
               ...prev,
               {
                  id: Date.now() + index,
                  x: pos.x,
                  y: pos.y,
                  colors: fireworkColors,
               },
            ]);
         }, index * 200);
      });
   }, [colors.primary, titleOpacity, titleScale, successTextOpacity]);

   const handleFireworkComplete = (id: number) => {
      completedFireworks.current += 1;
      // Remove completed firework after a delay
      setTimeout(() => {
         setFireworks((prev) => prev.filter((fw) => fw.id !== id));
      }, 100);
   };

   // Add notification on mount
   useEffect(() => {
      if (event) {
         const eventName = event.name || (event as any)?.title || 'Event';
         const ticketCount = ticketDetails.quantity;
         const ticketType = ticketDetails.type;

         // Use notificationService to create and save notification properly
         notificationService.showLocalNotification(
            'Payment Successful',
            `You successfully bought ${ticketCount} ${ticketType} ticket${ticketCount > 1 ? 's' : ''} for ${eventName}.`,
            'ticket',
            {
               eventId: event.id,
               eventName: eventName,
               reservationId: reservation?.id,
               ticketType: ticketType,
               ticketQuantity: ticketCount
            }
         );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

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

   return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
         {/* Fireworks Overlay */}
         <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {fireworks.map((firework) => (
               <FireworkBurst
                  key={firework.id}
                  x={firework.x}
                  y={firework.y}
                  colors={firework.colors}
                  onComplete={() => handleFireworkComplete(firework.id)}
               />
            ))}
         </View>

         <View style={styles.content}>
            {/* Success Icon */}
            <Animated.View
               style={[
                  styles.iconContainer,
                  {
                     backgroundColor: 'rgba(0, 255, 255, 0.1)',
                     shadowColor: colors.primary,
                     opacity: titleOpacity,
                     transform: [{ scale: titleScale }],
                  }
               ]}
            >
               <MaterialIcons name="check-circle" size={100} color={colors.primary} />
            </Animated.View>

            <Animated.View style={{ opacity: titleOpacity, transform: [{ scale: titleScale }] }}>
               <Text style={[styles.title, { color: colors.primary, textShadowColor: colors.primary }]}>Payment Successful!</Text>
            </Animated.View>

            <Animated.View style={{ opacity: successTextOpacity }}>
               <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Your ticket has been booked. You're all set for an unforgettable night.
               </Text>
            </Animated.View>

            {/* Verification Status Badge */}
            {verificationStatus === 'verified' && (
               <View style={[styles.statusBadge, { backgroundColor: 'rgba(76, 175, 80, 0.1)', borderColor: '#4CAF50' }]}>
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text style={[styles.statusText, { color: '#4CAF50' }]}>
                     Ticket saved to your account ✓
                  </Text>
               </View>
            )}
            {verificationStatus === 'pending' && (
               <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 193, 7, 0.1)', borderColor: '#FFC107' }]}>
                  <MaterialIcons name="sync" size={16} color="#FFC107" />
                  <Text style={[styles.statusText, { color: '#FFC107' }]}>
                     Saving ticket data... {retryCount > 0 ? `(Attempt ${retryCount + 1})` : ''}
                  </Text>
               </View>
            )}
            {verificationStatus === 'failed' && (
               <View style={[styles.statusBadge, { backgroundColor: 'rgba(244, 67, 54, 0.1)', borderColor: '#F44336' }]}>
                  <MaterialIcons name="info" size={16} color="#F44336" />
                  <Text style={[styles.statusText, { color: '#F44336' }]}>
                     Payment successful, but ticket data not confirmed. Contact support if ticket doesn't appear.
                  </Text>
               </View>
            )}

            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
               <Row
                  label="Event"
                  value={event?.name || (event as any)?.title || 'Event'}
                  color={colors.text}
                  labelColor={colors.textSecondary}
               />
               <Row
                  label="Date"
                  value={formatDate(event?.date)}
                  color={colors.text}
                  labelColor={colors.textSecondary}
               />
               <Row
                  label="Venue"
                  value={event?.location || 'TBD'}
                  color={colors.text}
                  labelColor={colors.textSecondary}
               />
               <Row
                  label="Tickets"
                  value={`${ticketDetails.quantity} ${ticketDetails.type} Ticket${ticketDetails.quantity > 1 ? 's' : ''}`}
                  color={colors.text}
                  labelColor={colors.textSecondary}
               />
               {reservation && (
                  <Row
                     label="Reservation ID"
                     value={`#${reservation.id}`}
                     color={colors.text}
                     labelColor={colors.textSecondary}
                  />
               )}
               <View style={[styles.separator, { backgroundColor: colors.border }]} />
               <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
                  <Text style={[styles.totalValue, { color: colors.text }]}>{formatPrice(total)}</Text>
               </View>
            </View>

            {/* Buttons */}
            <TouchableOpacity
               style={[styles.primaryButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
               onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Tickets' })}
            >
               <Text style={[styles.primaryButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>View My Ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => (navigation as any).navigate('MainTabs', { screen: 'HomeTab' })}>
               <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Back to Home</Text>
            </TouchableOpacity>
         </View>
      </SafeAreaView>
   );
};

const Row = ({ label, value, color, labelColor }: { label: string, value: string, color: string, labelColor: string }) => (
   <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: color }]}>{value}</Text>
   </View>
);

const styles = StyleSheet.create({
   container: {
      flex: 1,
   },
   content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
   },
   iconContainer: {
      width: 128,
      height: 128,
      borderRadius: 64,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 30,
      elevation: 10,
   },
   title: {
      fontSize: 36,
      fontWeight: 'bold',
      marginBottom: 16,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
   },
   subtitle: {
      textAlign: 'center',
      maxWidth: 300,
      marginBottom: 16,
      fontSize: 14,
      lineHeight: 20,
   },
   statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 32,
      maxWidth: '90%',
   },
   statusText: {
      fontSize: 13,
      fontWeight: '500',
      flex: 1,
      textAlign: 'center',
   },
   summaryCard: {
      width: '100%',
      borderRadius: 16,
      padding: 20,
      marginBottom: 32,
   },
   row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
   },
   rowLabel: {
      fontSize: 14,
   },
   rowValue: {
      fontSize: 14,
      fontWeight: '500',
   },
   separator: {
      height: 1,
      marginVertical: 16,
   },
   totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
   },
   totalLabel: {
      fontSize: 14,
   },
   totalValue: {
      fontSize: 16,
      fontWeight: 'bold',
   },
   primaryButton: {
      width: '100%',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 24,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 5,
   },
   primaryButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
   },
   secondaryButtonText: {
      fontSize: 14,
   },
});

export default PaymentSuccess;