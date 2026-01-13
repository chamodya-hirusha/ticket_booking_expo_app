import React, { useState, useEffect, useCallback } from 'react';
import {
   View,
   Text,
   StyleSheet,
   ScrollView,
   TouchableOpacity,
   Platform,
   Alert,
   ActivityIndicator,
   RefreshControl,
   Pressable
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';

interface PaymentItem {
   id: string;
   eventName?: string;
   amount: number;
   currency: string;
   status: string;
   statusColor?: 'success' | 'warning' | 'error';
   paymentDate: string;
   reservationId?: number;
}

const Profile = () => {
   const navigation = useNavigation();
   const { colors, theme, toggleTheme } = useTheme();
   const { user, signOut, isAuthenticated, handlePermissionError } = useAuth();
   const [profileData, setProfileData] = useState<any>(null);
   const [payments, setPayments] = useState<PaymentItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [currentPage, setCurrentPage] = useState(0);
   const PAGE_SIZE = 5;

   // Fetch user profile data
   const fetchProfileData = useCallback(async (showLoading: boolean = true) => {
      if (!isAuthenticated) {
         setLoading(false);
         return;
      }

      try {
         if (showLoading) {
            setLoading(true);
         }
         setError(null);

         // Fetch current user data
         const userResponse = await apiService.user.getCurrentUser();

         if (!userResponse.success) {
            const status = (userResponse as any).data?._status || (userResponse as any).status;
            if (status === 401 || userResponse.error?.toLowerCase().includes('token')) {
               if (handlePermissionError) await handlePermissionError();
               return;
            }
         }

         if (userResponse.success && userResponse.data) {
            setProfileData(userResponse.data);
         }

         // Fetch payment history
         const paymentsResponse = await apiService.payment.getUserPayments();

         if (!paymentsResponse.success) {
            const status = (paymentsResponse as any).data?._status || (paymentsResponse as any).status;
            const errorMsg = paymentsResponse.error || '';

            if (status === 401 || status === 403 || errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('permission')) {
               if (handlePermissionError) await handlePermissionError();
            }
         }

         if (paymentsResponse.success && paymentsResponse.data) {
            let paymentsArray: any[] = [];
            const dataObj = paymentsResponse.data as any;

            // Handle different response structures
            if (Array.isArray(dataObj)) {
               paymentsArray = dataObj;
            } else if (dataObj && typeof dataObj === 'object') {
               if ('code' in dataObj && 'content' in dataObj) {
                  const content = dataObj.content;
                  if (Array.isArray(content)) {
                     paymentsArray = content;
                  } else if (content && typeof content === 'object' && 'content' in content) {
                     if (Array.isArray(content.content)) {
                        paymentsArray = content.content;
                     }
                  }
               } else if ('content' in dataObj) {
                  if (Array.isArray(dataObj.content)) {
                     paymentsArray = dataObj.content;
                  } else if (dataObj.content && typeof dataObj.content === 'object' && 'content' in dataObj.content) {
                     if (Array.isArray(dataObj.content.content)) {
                        paymentsArray = dataObj.content.content;
                     }
                  }
               }
            }

            // Map payments to PaymentItem format
            const mappedPayments = paymentsArray.map((payment: any) => {
               const eventName = payment.reservationDetails?.eventDetails?.name
                  || payment.reservationDetails?.eventName
                  || payment.eventName
                  || 'Event';

               let paymentDate = 'TBD';
               if (payment.paymentDate) {
                  try {
                     paymentDate = new Date(payment.paymentDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                     });
                  } catch {
                     paymentDate = payment.paymentDate;
                  }
               }

               const rawStatus = payment.status || payment.paymentStatus || 'SUCCESS';
               let status = 'Paid';
               let statusColor: 'success' | 'warning' | 'error' = 'success';

               if (rawStatus) {
                  const paymentStatus = String(rawStatus).toUpperCase().trim();

                  // Handle all possible payment statuses
                  switch (paymentStatus) {
                     case 'SUCCESS':
                     case 'COMPLETED':
                     case 'CONFIRMED':
                        status = 'Paid';
                        statusColor = 'success';
                        break;
                     case 'PENDING':
                     case 'PROCESSING':
                        status = 'Pending';
                        statusColor = 'warning';
                        break;
                     case 'REFUNDED':
                     case 'CANCELLED':
                        status = 'Refunded';
                        statusColor = 'error';
                        break;
                     case 'FAILED':
                     case 'DECLINED':
                        status = 'Failed';
                        statusColor = 'error';
                        break;
                     default:
                        status = paymentStatus || 'Paid';
                        statusColor = 'success';
                        if (__DEV__) {
                           Alert.alert('Unknown payment status', paymentStatus);
                        }
                        break;
                  }
               }

               return {
                  id: String(payment.id || payment.paymentId || Math.random()),
                  eventName,
                  amount: payment.amount || 0,
                  currency: payment.currency || 'USD',
                  status,
                  statusColor,
                  paymentDate,
                  reservationId: payment.reservationId,
               };
            });

            setPayments(mappedPayments);
         }
      } catch (err: any) {
         Alert.alert('Error', err.message);
      } finally {
         if (showLoading) {
            setLoading(false);
         }
         setRefreshing(false);
      }
   }, [isAuthenticated]);

   useEffect(() => {
      fetchProfileData();
   }, [fetchProfileData]);

   const onRefresh = () => {
      setRefreshing(true);
      setCurrentPage(0);
      fetchProfileData(false);
   };

   const handleLogout = () => {
      Alert.alert(
         'Logout',
         'Are you sure you want to logout?',
         [
            {
               text: 'Cancel',
               style: 'cancel'
            },
            {
               text: 'Logout',
               style: 'destructive',
               onPress: async () => {
                  await signOut();
               }
            }
         ]
      );
   };

   // Calculate pagination
   const totalPages = Math.ceil(payments.length / PAGE_SIZE);
   const startIndex = currentPage * PAGE_SIZE;
   const endIndex = startIndex + PAGE_SIZE;
   const currentPayments = payments.slice(startIndex, endIndex);

   // Handle page change
   const handlePageChange = (newPage: number) => {
      if (newPage >= 0 && newPage < totalPages) {
         setCurrentPage(newPage);
      }
   };

   // Render pagination component
   const renderPagination = () => {
      if (totalPages <= 1 || payments.length === 0) return null;

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
            <View style={styles.paginationControls}>
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
                  <Feather
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
                  <Feather
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

   return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
         {/* Header */}
         <View style={styles.header}>
            <TouchableOpacity
               style={styles.backButton}
               onPress={() => (navigation as any).navigate('MainTabs', { screen: 'HomeTab' })}
            >
               <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Profile</Text>
            <TouchableOpacity
               style={styles.logoutIconButton}
               onPress={handleLogout}
            >
               <Feather name="log-out" size={24} color={colors.error} />
            </TouchableOpacity>
         </View>

         <ScrollView
            style={styles.scrollView}
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
            {loading ? (
               <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile...</Text>
               </View>
            ) : (
               <>
                  <View style={styles.profileSection}>
                     <View style={[styles.avatarContainer, { borderColor: colors.primary, shadowColor: colors.primary }]}>
                        <Image
                           source={{ uri: profileData?.avatar || user?.avatar || "https://api.dicebear.com/7.x/avataaars/png?seed=" + (profileData?.name || user?.name || 'user') }}
                           style={styles.avatar}
                        />
                     </View>
                     <Text style={[styles.userName, { color: colors.text }]}>
                        {profileData?.name || user?.name || 'Guest User'}
                     </Text>
                     <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                        {profileData?.email || user?.email || 'guest@example.com'}
                     </Text>
                     {profileData?.phone && (
                        <Text style={[styles.userPhone, { color: colors.textSecondary }]}>
                           {profileData.phone}
                        </Text>
                     )}
                  </View>
               </>
            )}

            <View style={styles.section}>
               <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>ACCOUNT</Text>
               <View style={styles.settingsList}>
                  <SettingsItem
                     icon="user"
                     label="Account Details"
                     colors={colors}
                     onPress={() => navigation.navigate('EditProfile' as never)}
                  />
                  <SettingsItem
                     icon="bell"
                     label="Notifications"
                     colors={colors}
                     onPress={() => navigation.navigate('Notifications' as never)}
                  />
                  <SettingsItem
                     icon={theme === 'dark' ? 'moon' : 'sun'}
                     label={`Theme: ${theme === 'dark' ? 'Dark' : 'Light'}`}
                     onPress={toggleTheme}
                     colors={colors}
                  />
                  <SettingsItem
                     icon="help-circle"
                     label="Help & Support"
                     onPress={() => navigation.navigate('Support' as never)}
                     colors={colors}
                  />
               </View>
            </View>

            {!loading && (
               <View style={styles.section}>
                  <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>PAYMENT HISTORY</Text>
                  {error ? (
                     <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: colors.error || '#ff4444' }]}>{error}</Text>
                        <TouchableOpacity
                           style={[styles.retryButton, { backgroundColor: colors.primary }]}
                           onPress={() => fetchProfileData()}
                        >
                           <Text style={[styles.retryButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>Retry</Text>
                        </TouchableOpacity>
                     </View>
                  ) : payments.length === 0 ? (
                     <View style={[styles.paymentList, { backgroundColor: colors.surface }]}>
                        <View style={styles.emptyPaymentContainer}>
                           <Feather name="credit-card" size={32} color={colors.textSecondary} />
                           <Text style={[styles.emptyPaymentText, { color: colors.textSecondary }]}>
                              No payment history found
                           </Text>
                        </View>
                     </View>
                  ) : (
                     <>
                        <View style={[styles.paymentList, { backgroundColor: colors.surface }]}>
                           {currentPayments.map((payment, index) => (
                              <React.Fragment key={payment.id}>
                                 {index > 0 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                                 <PaymentItem
                                    title={payment.eventName}
                                    date={payment.paymentDate}
                                    amount={payment.amount.toFixed(2)}
                                    status={payment.status}
                                    statusColor={payment.statusColor}
                                    colors={colors}
                                 />
                              </React.Fragment>
                           ))}
                        </View>
                        {renderPagination()}
                     </>
                  )}
               </View>
            )}

            <View style={styles.logoutSection}>
               <TouchableOpacity
                  style={[styles.logoutButton, { borderColor: colors.error }]}
                  onPress={handleLogout}
               >
                  <LinearGradient
                     colors={['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)']}
                     style={styles.logoutButtonGradient}
                  >
                     <Feather name="log-out" size={20} color={colors.error} />
                     <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
                  </LinearGradient>
               </TouchableOpacity>
            </View>

            <View style={{ height: 100 }} />
         </ScrollView>
      </SafeAreaView>
   );
};

const SettingsItem = ({ icon, label, onPress, colors }: { icon: string, label: string, onPress?: () => void, colors: any }) => (
   <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <View style={styles.settingsLeft}>
         <View style={[styles.settingsIconContainer, { backgroundColor: colors.inputBackground }]}>
            <Feather name={icon as any} size={20} color={colors.primary} />
         </View>
         <Text style={[styles.settingsLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={24} color={colors.textSecondary} />
   </TouchableOpacity>
);

const PaymentItem = ({ title, date, amount, status, statusColor, colors }: { title: string, date: string, amount: string, status: string, statusColor?: 'success' | 'warning' | 'error', colors: any }) => {
   // Warning color fallback (amber/orange)
   const warningColor = '#f59e0b';

   const getBadgeColor = () => {
      switch (statusColor) {
         case 'success':
            return { backgroundColor: `${colors.success}20`, textColor: colors.success };
         case 'warning':
            return { backgroundColor: `${warningColor}20`, textColor: warningColor };
         case 'error':
            return { backgroundColor: `${colors.error}20`, textColor: colors.error };
         default:
            const statusUpper = (status || '').toUpperCase();
            if (statusUpper === 'PAID' || statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED') {
               return { backgroundColor: `${colors.success}20`, textColor: colors.success };
            } else if (statusUpper === 'PENDING' || statusUpper === 'PROCESSING') {
               return { backgroundColor: `${warningColor}20`, textColor: warningColor };
            } else {
               return { backgroundColor: `${colors.error}20`, textColor: colors.error };
            }
      }
   };

   const badgeStyle = getBadgeColor();

   return (
      <View style={styles.paymentItem}>
         <View style={{ flex: 1 }}>
            <Text style={[styles.paymentTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>{date}</Text>
         </View>
         <View style={styles.paymentRight}>
            <Text style={[styles.paymentAmount, { color: colors.text }]}>${amount}</Text>
            <View style={[styles.statusBadge, { backgroundColor: badgeStyle.backgroundColor }]}>
               <Text style={[styles.statusText, { color: badgeStyle.textColor }]}>{status || 'Paid'}</Text>
            </View>
         </View>
      </View>
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
      paddingVertical: 16,
   },
   backButton: {
      padding: 4,
   },
   headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
   },
   logoutIconButton: {
      padding: 4,
   },
   scrollView: {
      flex: 1,
   },
   profileSection: {
      alignItems: 'center',
      padding: 24,
   },
   avatarContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 3,
      padding: 4,
      marginBottom: 16,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 15,
      elevation: 8,
   },
   avatar: {
      width: '100%',
      height: '100%',
      borderRadius: 56,
   },
   userName: {
      fontSize: 26,
      fontWeight: 'bold',
      marginBottom: 6,
   },
   userEmail: {
      fontSize: 15,
      marginBottom: 24,
   },
   section: {
      paddingHorizontal: 20,
      marginBottom: 32,
   },
   sectionHeader: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 16,
      marginLeft: 4,
      letterSpacing: 1.2,
   },
   settingsList: {
      gap: 8,
   },
   settingsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 16,
   },
   settingsLeft: {
      flexDirection: 'row',
      alignItems: 'center',
   },
   settingsIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
   },
   settingsLabel: {
      fontSize: 16,
      fontWeight: '500',
   },
   paymentList: {
      borderRadius: 20,
      padding: 16,
   },
   paymentItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
   },
   paymentTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 4,
   },
   paymentDate: {
      fontSize: 13,
   },
   paymentRight: {
      alignItems: 'flex-end',
   },
   paymentAmount: {
      fontSize: 17,
      fontWeight: 'bold',
      marginBottom: 6,
   },
   statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
   },
   statusText: {
      fontSize: 11,
      fontWeight: 'bold',
   },
   separator: {
      height: 1,
      marginVertical: 8,
   },
   logoutSection: {
      paddingHorizontal: 20,
      marginTop: 8,
   },
   logoutButton: {
      borderRadius: 16,
      borderWidth: 1.5,
      overflow: 'hidden',
   },
   logoutButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 10,
   },
   logoutText: {
      fontWeight: 'bold',
      fontSize: 16,
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
   userPhone: {
      fontSize: 14,
      marginTop: 4,
   },
   errorContainer: {
      padding: 20,
      alignItems: 'center',
   },
   errorText: {
      fontSize: 14,
      marginBottom: 12,
      textAlign: 'center',
   },
   retryButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
   },
   retryButtonText: {
      fontSize: 14,
      fontWeight: '600',
   },
   emptyPaymentContainer: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
   },
   emptyPaymentText: {
      marginTop: 12,
      fontSize: 14,
      textAlign: 'center',
   },
   paginationContainer: {
      padding: 16,
      paddingTop: 12,
      paddingBottom: 10,
      marginBottom: 20,
      borderTopWidth: 0,
      gap: 12,
      borderRadius: 12,
   },
   paginationControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#ffffff',
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

export default Profile;