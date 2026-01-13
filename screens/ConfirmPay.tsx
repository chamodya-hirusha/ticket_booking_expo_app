import React, { useState, useEffect } from 'react';
import {
   View,
   Text,
   StyleSheet,
   TouchableOpacity,
   ScrollView,
   Dimensions,
   Platform,
   ActivityIndicator,
   Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { useTheme } from '../context/ThemeContext';
import { Event } from '../constants';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface TicketType {
   id: string;
   name: string;
   price: number;
   quantity: number;
}

type ConfirmPayRouteProp = RouteProp<{
   ConfirmPay: {
      event: Event;
      tickets?: TicketType[];
      total?: number;
   }
}, 'ConfirmPay'>;

const { width } = Dimensions.get('window');
const SERVICE_FEE = 10;

const ConfirmPay = () => {
   const navigation = useNavigation();
   const route = useRoute<ConfirmPayRouteProp>();
   const { user, handlePermissionError } = useAuth();
   const { colors, theme } = useTheme();
   const { initPaymentSheet, presentPaymentSheet } = useStripe();

   const event = route.params?.event;
   const tickets = route.params?.tickets || [];

   const [processing, setProcessing] = useState(false);
   const [personalDetails, setPersonalDetails] = useState<{
      name: string;
      email: string;
      phone: string;
   } | null>(null);
   const [loadingDetails, setLoadingDetails] = useState(false);

   const getTicketDetails = React.useMemo(() => {
      if (tickets.length > 0) {
         const ticket = tickets[0]; 
         let actualPrice = ticket.price;
         if (event) {
            const ticketTypeUpper = ticket.id.toUpperCase();
            if (ticketTypeUpper.includes('VIP')) {
               actualPrice = event.vipTicketPrice || ticket.price;
            } else if (ticketTypeUpper.includes('PREMIUM')) {
               actualPrice = event.premiumTicketPrice || ticket.price;
            } else {
               actualPrice = event.generalTicketPrice || ticket.price;
            }
         }

         return {
            type: ticket.name || 'General',
            quantity: ticket.quantity || 1,
            price: actualPrice || 0,
            total: (actualPrice || 0) * (ticket.quantity || 1)
         };
      }

      const fallbackPrice = event?.generalTicketPrice || (event as any)?.price || 75;
      return {
         type: 'General',
         quantity: 2,
         price: fallbackPrice,
         total: fallbackPrice * 2
      };
   }, [tickets, event]);

   const ticketDetails = getTicketDetails;
   const totalAmount = (ticketDetails.total || 0) + SERVICE_FEE;

   useEffect(() => {
      const loadPersonalDetails = async () => {
         if (!user) return;

         setLoadingDetails(true);
         try {
            const userResponse = await apiService.user.getCurrentUser();

            if (userResponse.success && userResponse.data) {
               let userData: any = userResponse.data;
               if (userData?.content) userData = userData.content;
               if (userData?.data) userData = userData.data;

               setPersonalDetails({
                  name: userData?.name || user.name || '',
                  email: userData?.email || user.email || '',
                  phone: userData?.phone || user.phone || '',
               });
            } else {
               const status = (userResponse as any).data?._status || (userResponse as any).status;
               if (status === 401 || userResponse.error?.toLowerCase().includes('token')) {
                  if (handlePermissionError) await handlePermissionError();
                  return;
               }
               setPersonalDetails({
                  name: user.name || '',
                  email: user.email || '',
                  phone: user.phone || '',
               });
            }
         } catch (error) {
            Alert.alert('Error', 'Failed to load personal details');
            setPersonalDetails({
               name: user.name || '',
               email: user.email || '',
               phone: user.phone || '',
            });
         } finally {
            setLoadingDetails(false);
         }
      };

      loadPersonalDetails();
   }, [user]);

   const mapTicketTypeToAPI = (ticketName: string): string => {
      const upperName = ticketName.toUpperCase();
      if (upperName.includes('VIP')) return 'VIP';
      if (upperName.includes('PREMIUM')) return 'PREMIUM';
      return 'GENERAL';
   };

   const handlePay = async () => {
      if (!event || !event.id) {
         Alert.alert('Error', 'Event information is missing');
         return;
      }

      if (!user) {
         Alert.alert('Authentication Required', 'Please sign in to complete payment');
         return;
      }

      setProcessing(true);

      try {
         const eventId = parseInt(event.id);
         if (isNaN(eventId) || eventId <= 0) {
            Alert.alert('Invalid Event', 'Event ID is invalid.');
            setProcessing(false);
            return;
         }

         if (ticketDetails.quantity <= 0 || ticketDetails.quantity > 10) {
            Alert.alert('Invalid Quantity', 'Please select between 1 and 10 tickets.');
            setProcessing(false);
            return;
         }

         const ticketType = mapTicketTypeToAPI(ticketDetails.type);
         const reservationResponse = await apiService.reservation.createReservation(
            eventId,
            ticketType,
            ticketDetails.quantity,
            ticketDetails.price,
            user.id,
            (user as any).role || 'USER'
         );

         if (!reservationResponse.success || !reservationResponse.data) {
            const status = (reservationResponse as any).data?._status || (reservationResponse as any).status;
            let errorMessage = reservationResponse.error || 'Failed to create reservation';

            if (status === 401 || errorMessage.toLowerCase().includes('token')) {
               if (handlePermissionError) await handlePermissionError();
               setProcessing(false);
               return;
            }

            Alert.alert('Reservation Failed', errorMessage);
            setProcessing(false);
            return;
         }

         const reservation = reservationResponse.data;
         const paymentResponse = await apiService.payment.createStripePayment(
            reservation.id,
            totalAmount,
            'USD',
            user.id
         );

         if (!paymentResponse.success || !paymentResponse.data?.clientSecret) {
            Alert.alert('Payment Error', paymentResponse.error || 'Failed to initialize payment');
            setProcessing(false);
            return;
         }

         const payment = paymentResponse.data;
         const { error: initError } = await initPaymentSheet({
            paymentIntentClientSecret: payment.clientSecret!,
            merchantDisplayName: 'Ticket Booking',
            allowsDelayedPaymentMethods: true,
            billingDetailsCollectionConfiguration: {
               name: 'never' as any,
               email: 'never' as any,
               phone: 'never' as any,
               address: 'never' as any,
            },
         });

         if (initError) {
            if (payment?.intentId) await apiService.payment.verifyPayment(payment.intentId);
            Alert.alert('Payment Error', initError.message);
            setProcessing(false);
            return;
         }

         const { error: presentError } = await presentPaymentSheet();
         if (presentError) {
            if (payment?.intentId) await apiService.payment.verifyPayment(payment.intentId);
            if (presentError.code !== 'Canceled') Alert.alert('Payment Failed', presentError.message);
            setProcessing(false);
            return;
         }

         (navigation as any).navigate('PaymentSuccess', {
            event,
            reservation,
            payment,
            ticketDetails: {
               type: ticketDetails.type,
               quantity: ticketDetails.quantity,
               price: ticketDetails.price,
            },
            total: totalAmount,
         });

      } catch (error) {
         Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      } finally {
         setProcessing(false);
      }
   };

   if (!event) {
      return (
         <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
               <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                  <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
               </TouchableOpacity>
               <Text style={[styles.headerTitle, { color: colors.text }]}>Confirm & Pay</Text>
               <View style={{ width: 40 }} />
            </View>
            <View style={styles.errorContainer}>
               <Text style={[styles.errorText, { color: colors.text }]}>Event information is missing</Text>
               <TouchableOpacity
                  style={[styles.backButton, { backgroundColor: colors.primary, padding: 12, borderRadius: 8, marginTop: 16 }]}
                  onPress={() => navigation.goBack()}
               >
                  <Text style={{ color: theme === 'dark' ? '#000' : '#fff', fontWeight: '600' }}>Go Back</Text>
               </TouchableOpacity>
            </View>
         </SafeAreaView>
      );
   }

   return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
         <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
               <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Confirm & Pay</Text>
            <View style={{ width: 40 }} />
         </View>

         <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <Text style={[
                  styles.sectionTitle,
                  { color: colors.primary },
                  theme === 'dark' && {
                     textShadowColor: colors.primary,
                     textShadowOffset: { width: 0, height: 0 },
                     textShadowRadius: 10
                  }
               ]}>Order Summary</Text>

               <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.rowItem}>
                     <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>
                        {event?.name || (event as any)?.title || 'Event'}
                     </Text>
                     <Text style={[styles.itemValue, { color: colors.text }]}>
                        {event?.date ? new Date(event.date).toLocaleDateString('en-US', {
                           month: 'short',
                           day: 'numeric',
                           year: 'numeric'
                        }) : 'TBD'}
                     </Text>
                  </View>
                  <View style={styles.rowItem}>
                     <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>
                        Tickets ({ticketDetails?.quantity || 0} x {ticketDetails?.type || 'General'} @ ${(ticketDetails?.price || 0).toFixed(2)})
                     </Text>
                     <Text style={[styles.itemValue, { color: colors.text }]}>
                        ${(ticketDetails?.total || 0).toFixed(2)}
                     </Text>
                  </View>
                  <View style={styles.rowItem}>
                     <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Service Fee</Text>
                     <Text style={[styles.itemValue, { color: colors.text }]}>${SERVICE_FEE.toFixed(2)}</Text>
                  </View>
               </View>

               <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
                  <Text style={[
                     styles.totalValue,
                     { color: colors.primary },
                     theme === 'dark' && {
                        textShadowColor: colors.primary,
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 10
                     }
                  ]}>
                     ${(totalAmount || 0).toFixed(2)}
                  </Text>
               </View>
            </View>

            {personalDetails && (
               <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 24 }]}>
                  <Text style={[
                     styles.sectionTitle,
                     { color: colors.primary },
                     theme === 'dark' && {
                        textShadowColor: colors.primary,
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 10
                     }
                  ]}>Personal Details</Text>

                  <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
                     <View style={styles.rowItem}>
                        <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Name</Text>
                        <Text style={[styles.itemValue, { color: colors.text }]}>{personalDetails.name || 'Not provided'}</Text>
                     </View>
                     <View style={styles.rowItem}>
                        <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Email</Text>
                        <Text style={[styles.itemValue, { color: colors.text }]}>{personalDetails.email || 'Not provided'}</Text>
                     </View>
                     {personalDetails.phone && (
                        <View style={styles.rowItem}>
                           <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Phone</Text>
                           <Text style={[styles.itemValue, { color: colors.text }]}>{personalDetails.phone}</Text>
                        </View>
                     )}
                  </View>
               </View>
            )}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 24 }]}>
               <Text style={[
                  styles.sectionTitle,
                  { color: colors.primary },
                  theme === 'dark' && {
                     textShadowColor: colors.primary,
                     textShadowOffset: { width: 0, height: 0 },
                     textShadowRadius: 10
                  }
               ]}>Payment</Text>
               <Text style={[styles.paymentInfoText, { color: colors.textSecondary }]}>
                  Click "Pay Now" to securely complete your payment using Stripe's secure payment system.
               </Text>
            </View>
         </ScrollView>

         <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
               style={[
                  styles.payButton,
                  {
                     backgroundColor: processing ? colors.inputBackground : colors.primary,
                     shadowColor: colors.primary,
                     opacity: processing ? 0.6 : 1
                  }
               ]}
               onPress={handlePay}
               disabled={processing}
            >
               {processing ? (
                  <ActivityIndicator size="small" color={theme === 'dark' ? '#000' : '#fff'} />
               ) : (
                  <>
                     <MaterialIcons name="lock" size={20} color={theme === 'dark' ? '#000' : '#fff'} />
                     <Text style={[styles.payButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>COMPLETE PAYMENT</Text>
                     <Text style={[styles.payButtonAmount, { color: theme === 'dark' ? '#000' : '#fff' }]}>${totalAmount.toFixed(2)}</Text>
                  </>
               )}
            </TouchableOpacity>
         </View>
      </SafeAreaView>
   );
};

const styles = StyleSheet.create({
   container: { flex: 1 },
   header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
   backButton: { padding: 8 },
   headerTitle: { fontSize: 18, fontWeight: 'bold' },
   scrollView: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
   card: { borderRadius: 20, padding: 20, borderWidth: 1 },
   sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
   summaryRow: { borderBottomWidth: 1, paddingBottom: 16, marginBottom: 16, gap: 12 },
   rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
   itemLabel: { fontSize: 14 },
   itemValue: { fontSize: 14, fontWeight: '500' },
   totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
   totalLabel: { fontSize: 16, fontWeight: '600' },
   totalValue: { fontSize: 24, fontWeight: 'bold' },
   paymentInfoText: { fontSize: 14, lineHeight: 20, marginTop: 8 },
   footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1 },
   payButton: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, elevation: 5 },
   payButtonText: { fontSize: 18, fontWeight: 'bold' },
   payButtonAmount: { fontSize: 18, fontWeight: 'bold' },
   errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
   errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
});

export default ConfirmPay;