import React, { useState } from 'react';
import {
   View,
   Text,
   StyleSheet,
   TouchableOpacity,
   ScrollView,
   Dimensions,
   ActivityIndicator,
   Alert,
   Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Ticket } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { generateTicketPDF } from '../utils/ticketPdfGenerator';
import { toast } from '../services/toast';
import { useCustomToast } from '../context/ToastContext';

type TicketDetailRouteProp = RouteProp<{ TicketDetail: { ticket: Ticket } }, 'TicketDetail'>;

const { width } = Dimensions.get('window');

const TicketDetail = () => {
   const navigation = useNavigation();
   const route = useRoute<TicketDetailRouteProp>();
   const { ticket } = route.params;
   const { colors, theme } = useTheme();
   const customToast = useCustomToast();
   const [qrLoading, setQrLoading] = useState(true);
   const [qrError, setQrError] = useState(false);
   const [downloading, setDownloading] = useState(false);
   const [sharing, setSharing] = useState(false);

   // Generate QR code URL from qrToken
   const getQrCodeUrl = () => {
      if (ticket.qrCode) {
         const encodedToken = encodeURIComponent(ticket.qrCode);
         return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedToken}`;
      }
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${ticket.id}`;
   };


   // Download ticket as PDF
   const handleDownload = async () => {
      if (!ticket.qrCode) {
         customToast.error('QR code is not available for this ticket.');
         return;
      }

      try {
         setDownloading(true);

         const result = await generateTicketPDF(ticket, { directDownload: true });

         if (result.success) {
            const locationMessage = Platform.OS === 'android'
               ? (result.savedToDownloads ? 'Downloads folder' : 'App Documents folder')
               : (result.savedToDownloads ? 'Files app / Downloads folder' : 'App Documents folder');

            customToast.success(
               `Your ticket PDF has been saved to your device.\n\nEvent: ${ticket.eventTitle}\nFile: ${result.fileName}`,
               'PDF Generated Successfully! ✅'
            );
         } else {
            customToast.error(
               result.error || 'Failed to generate ticket PDF. Please check your internet connection and try again.',
               'PDF Generation Failed'
            );
         }
      } catch (error: any) {
         console.error('[TicketDetail] PDF generation error:', error);
         customToast.error(
            error.message || 'Failed to generate ticket PDF. Please check your internet connection and try again.',
            'PDF Generation Failed'
         );
      } finally {
         setDownloading(false);
      }
   };

   // Share ticket as PDF
   const handleShare = async () => {
      if (!ticket.qrCode) {
         customToast.error('QR code is not available for this ticket.');
         return;
      }

      try {
         setSharing(true);

         // Generate PDF and share it
         const result = await generateTicketPDF(ticket, { share: true });

         if (result.success) {
            customToast.success(
               `Your ticket PDF has been shared successfully.\n\nEvent: ${ticket.eventTitle}`,
               'PDF Shared Successfully! ✅'
            );
         } else {
            customToast.error(
               result.error || 'Failed to generate or share ticket PDF. Please check your internet connection and try again.',
               'Share Failed'
            );
         }
      } catch (error: any) {
         customToast.error(
            error.message || 'Failed to share ticket PDF. Please try again.',
            'Share Failed'
         );
      } finally {
         setSharing(false);
      }
   };

   return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
         <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
               <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Your Ticket</Text>
            <TouchableOpacity style={styles.iconButton}>
               <Ionicons name="settings-outline" size={24} color={colors.text} />
            </TouchableOpacity>
         </View>

         <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
         >
            {/* Valid Badge */}
            <View style={styles.badgeContainer}>
               <View style={[styles.validBadge, { borderColor: colors.success, shadowColor: colors.success }]}>
                  <MaterialIcons name="verified-user" size={16} color={colors.success} style={{ marginRight: 5 }} />
                  <Text style={[styles.validText, { color: colors.success }]}>VALID</Text>
               </View>
            </View>

            {/* QR Code Section */}
            <View style={styles.qrContainer}>
               <View style={[styles.qrFrame, { borderColor: colors.primary, shadowColor: colors.primary }]}>
                  <View style={[styles.qrInner, { borderColor: colors.primary }]}>
                     {ticket.qrCode ? (
                        <>
                           {qrLoading && (
                              <View style={styles.qrCodeLoading}>
                                 <ActivityIndicator size="large" color={colors.primary} />
                              </View>
                           )}
                           {qrError ? (
                              <View style={[styles.qrCodePlaceholder, { backgroundColor: colors.inputBackground }]}>
                                 <MaterialIcons name="error-outline" size={60} color={colors.error || '#ff4444'} />
                                 <Text style={[styles.qrCodePlaceholderText, { color: colors.textSecondary }]}>
                                    Failed to load QR Code
                                 </Text>
                              </View>
                           ) : (
                              <Image
                                 source={{ uri: getQrCodeUrl() }}
                                 style={[styles.qrCode, { opacity: qrLoading ? 0 : 1 }]}
                                 resizeMode="contain"
                                 onLoadStart={() => {
                                    setQrLoading(true);
                                    setQrError(false);
                                 }}
                                 onLoadEnd={() => setQrLoading(false)}
                                 onError={() => {
                                    setQrLoading(false);
                                    setQrError(true);
                                 }}
                              />
                           )}
                        </>
                     ) : (
                        <View style={[styles.qrCodePlaceholder, { backgroundColor: colors.inputBackground }]}>
                           <MaterialIcons name="qr-code-scanner" size={80} color={colors.textSecondary} />
                           <Text style={[styles.qrCodePlaceholderText, { color: colors.textSecondary }]}>
                              QR Code Not Available
                           </Text>
                        </View>
                     )}
                  </View>
               </View>
               {ticket.qrCode && (
                  <Text style={[styles.qrTokenText, { color: colors.textSecondary }]}>
                     {ticket.qrCode}
                  </Text>
               )}
            </View>

            {/* Event Title */}
            <Text style={[styles.eventTitle, { color: colors.text }]}>
               {ticket.eventTitle?.toUpperCase() || 'CYBERPUNK 2077 LIVE CONCERT'}
            </Text>

            {/* Details Card */}
            <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               {/* Date */}
               <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 255, 255, 0.1)' }]}>
                     <Ionicons name="calendar" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                     {ticket.date || 'NOV 10, 2077 | 9:00 PM'}
                  </Text>
               </View>

               {/* Location */}
               <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 255, 255, 0.1)' }]}>
                     <Ionicons name="location" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                     {ticket.location || 'NIGHT CITY ARENA | District 7'}
                  </Text>
               </View>

               {/* Seat */}
               <View style={styles.detailRow}>
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 255, 255, 0.1)' }]}>
                     <MaterialIcons name="event-seat" size={20} color={colors.primary} />
                  </View>
                  <View>
                     <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Section / Row / Seat</Text>
                     <Text style={[styles.detailText, { color: colors.text }]}>
                        {ticket.seat || 'BLOCK C / ROW 12 / SEAT 42'}
                     </Text>
                  </View>
               </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
               activeOpacity={0.8}
               style={styles.downloadButtonContainer}
               onPress={handleDownload}
               disabled={downloading || !ticket.qrCode}
            >
               <LinearGradient
                  colors={[colors.primary, '#0099ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.downloadButton}
               >
                  {downloading ? (
                     <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                  ) : (
                     <Ionicons name="download-outline" size={24} color="#fff" style={{ marginRight: 10 }} />
                  )}
                  <Text style={styles.downloadButtonText}>
                     {downloading ? 'Downloading...' : 'Download Ticket'}
                  </Text>
               </LinearGradient>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
               <TouchableOpacity
                  style={[
                     styles.secondaryButton,
                     {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: (sharing || !ticket.qrCode) ? 0.6 : 1
                     }
                  ]}
                  onPress={handleShare}
                  disabled={sharing || !ticket.qrCode}
               >
                  {sharing ? (
                     <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 8 }} />
                  ) : (
                     <Ionicons name="share-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
                  )}
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                     {sharing ? 'Sharing...' : 'Share'}
                  </Text>
               </TouchableOpacity>
            </View>

         </ScrollView>
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
      paddingVertical: 15,
   },
   headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
   },
   iconButton: {
      padding: 5,
   },
   scrollContent: {
      padding: 20,
      alignItems: 'center',
   },
   badgeContainer: {
      marginBottom: 30,
   },
   validBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      backgroundColor: 'rgba(0, 255, 0, 0.1)', // Subtle green tint
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
      elevation: 5,
   },
   validText: {
      fontWeight: 'bold',
      fontSize: 14,
      letterSpacing: 1,
   },
   qrContainer: {
      marginBottom: 30,
      alignItems: 'center',
      justifyContent: 'center',
   },
   qrFrame: {
      width: 280,
      height: 280,
      borderRadius: 20,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000', // Dark background for contrast
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 15,
   },
   qrInner: {
      width: 240,
      height: 240,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderStyle: 'dashed',
   },
   qrCode: {
      width: 200,
      height: 200,
   },
   qrCodeLoading: {
      position: 'absolute',
      width: 200,
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
   },
   qrCodePlaceholder: {
      width: 200,
      height: 200,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
   },
   qrCodePlaceholderText: {
      marginTop: 10,
      fontSize: 12,
      textAlign: 'center',
   },
   qrTokenText: {
      marginTop: 10,
      fontSize: 10,
      fontFamily: 'monospace',
      textAlign: 'center',
      letterSpacing: 1,
   },
   eventTitle: {
      fontSize: 24,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 30,
      letterSpacing: 1,
      lineHeight: 32,
   },
   detailsCard: {
      width: '100%',
      borderRadius: 20,
      borderWidth: 1,
      padding: 20,
      marginBottom: 30,
   },
   detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: 'transparent', // Will be overridden
   },
   iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 15,
   },
   detailText: {
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
   },
   subLabel: {
      fontSize: 12,
      marginBottom: 4,
   },
   downloadButtonContainer: {
      width: '100%',
      marginBottom: 20,
      shadowColor: '#00ffff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 15,
      elevation: 10,
   },
   downloadButton: {
      flexDirection: 'row',
      width: '100%',
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
   },
   downloadButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
   },
   secondaryActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      gap: 15,
   },
   secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      height: 50,
      borderRadius: 25,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
   },
   secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
   },
});

export default TicketDetail;