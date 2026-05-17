import React, { useState } from 'react';
import {
   View,
   Text,
   StyleSheet,
   TouchableOpacity,
   TextInput,
   ScrollView,
   Linking,
   Platform,
   KeyboardAvoidingView,
   Alert,
   ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Support = () => {
   const navigation = useNavigation();
   const { colors, theme } = useTheme();
   const { user } = useAuth();
   const { t } = useLanguage();
   
   const [name, setName] = useState(user?.name || '');
   const [email, setEmail] = useState(user?.email || '');
   const [subject, setSubject] = useState('');
   const [message, setMessage] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
   
    // Validation
    const validateForm = () => {
       if (!name.trim()) {
          Alert.alert(t('support.validationError'), t('support.enterName'));
          return false;
       }
       if (name.trim().length < 2) {
          Alert.alert(t('support.validationError'), t('support.nameMinLength'));
          return false;
       }
       if (!email.trim()) {
          Alert.alert(t('support.validationError'), t('support.enterEmail'));
          return false;
       }
       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(email.trim())) {
          Alert.alert(t('support.validationError'), t('support.invalidEmail'));
          return false;
       }
       if (!subject.trim()) {
          Alert.alert(t('support.validationError'), t('support.enterSubject'));
          return false;
       }
       if (subject.trim().length < 3) {
          Alert.alert(t('support.validationError'), t('support.subjectMinLength'));
          return false;
       }
       if (!message.trim()) {
          Alert.alert(t('support.validationError'), t('support.enterMessage'));
          return false;
       }
       if (message.trim().length < 10) {
          Alert.alert(t('support.validationError'), t('support.messageMinLength'));
          return false;
       }
       return true;
    };
   
   // Handle form submission
   const handleSubmit = async () => {
      if (!validateForm()) {
         return;
      }
      
      setIsSubmitting(true);
      
      try {
         const response = await apiService.sendContactMessage(
            name.trim(),
            email.trim(),
            subject.trim(),
            message.trim()
         );
         
         if (response.success) {
            Alert.alert(
               t('support.messageSent'),
               response.message || t('support.contactSuccess'),
               [
                  {
                     text: 'OK',
                     onPress: () => {
                        // Reset form
                        setName(user?.name || '');
                        setEmail(user?.email || '');
                        setSubject('');
                        setMessage('');
                     }
                  }
               ]
            );
         } else {
            Alert.alert(
               t('common.error'),
               response.error || response.message || t('support.sendError')
            );
         }
      } catch (error: any) {
         Alert.alert(
            t('common.error'),
            error?.message || t('support.networkError')
         );
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
         {/* Header */}
         <View style={styles.header}>
            <TouchableOpacity
               onPress={() => navigation.goBack()}
               style={styles.backButton}
            >
               <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('support.title')}</Text>
            <View style={styles.placeholder} />
         </View>

         <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
         >
            <ScrollView
               style={styles.scrollView}
               showsVerticalScrollIndicator={true}
               contentContainerStyle={styles.scrollContent}
               keyboardShouldPersistTaps="handled"
            >
               {/* Hero Section */}
               <View style={styles.heroSection}>
                  <Text style={[styles.heroTitle, { color: colors.text }]}>{t('support.heroTitle')}</Text>
                  <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                     {t('support.heroSubtitle')}
                  </Text>
               </View>

               {/* Contact Options */}
               <View style={styles.gridContainer}>
                  <ContactCard
                     icon="mail"
                     title={t('support.emailUs')}
                     subtitle="support@ticketapp.com"
                     infoText={t('support.emailSubtitle')}
                     onPress={() => Linking.openURL('mailto:support@ticketapp.com')}
                     colors={colors}
                  />
                  <ContactCard
                     icon="phone"
                     title={t('support.callUs')}
                     subtitle="+1 (234) 567-890"
                     infoText={t('support.callSubtitle')}
                     onPress={() => Linking.openURL('tel:+1234567890')}
                     colors={colors}
                  />
               </View>

               {/* Message Form */}
               <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('support.sendMessage')}</Text>

                  <View style={styles.inputContainer}>
                     <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfile.fullName')}</Text>
                     <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <Feather name="user" size={20} color={colors.textSecondary} />
                        <TextInput
                           style={[styles.input, { color: colors.text }]}
                           placeholder={t('support.namePlaceholder')}
                           placeholderTextColor={colors.placeholder}
                           value={name}
                           onChangeText={setName}
                           editable={!isSubmitting}
                        />
                     </View>
                  </View>

                  <View style={styles.inputContainer}>
                     <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfile.email')}</Text>
                     <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <Feather name="mail" size={20} color={colors.textSecondary} />
                        <TextInput
                           style={[styles.input, { color: colors.text }]}
                           placeholder={t('support.emailPlaceholder')}
                           placeholderTextColor={colors.placeholder}
                           keyboardType="email-address"
                           autoCapitalize="none"
                           value={email}
                           onChangeText={setEmail}
                           editable={!isSubmitting}
                        />
                     </View>
                  </View>

                  <View style={styles.inputContainer}>
                     <Text style={[styles.label, { color: colors.textSecondary }]}>{t('support.subjectLabel')}</Text>
                     <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <Feather name="file-text" size={20} color={colors.textSecondary} />
                        <TextInput
                           style={[styles.input, { color: colors.text }]}
                           placeholder={t('support.subjectPlaceholder')}
                           placeholderTextColor={colors.placeholder}
                           value={subject}
                           onChangeText={setSubject}
                           editable={!isSubmitting}
                        />
                     </View>
                  </View>

                  <View style={styles.inputContainer}>
                     <Text style={[styles.label, { color: colors.textSecondary }]}>{t('support.messageLabel')}</Text>
                     <View style={[styles.textAreaWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <TextInput
                           style={[styles.textArea, { color: colors.text }]}
                           placeholder={t('support.messagePlaceholder')}
                           placeholderTextColor={colors.placeholder}
                           multiline
                           numberOfLines={2}
                           textAlignVertical="top"
                           value={message}
                           onChangeText={setMessage}
                           editable={!isSubmitting}
                        />
                     </View>
                  </View>

                  <TouchableOpacity
                     style={[
                        styles.submitButton, 
                        { 
                           backgroundColor: isSubmitting ? colors.textSecondary : colors.primary,
                           opacity: isSubmitting ? 0.6 : 1
                        }
                     ]}
                     onPress={handleSubmit}
                     disabled={isSubmitting}
                  >
                     {isSubmitting ? (
                        <ActivityIndicator size="small" color={theme === 'dark' ? '#000' : '#fff'} />
                     ) : (
                        <>
                           <Text style={[styles.submitButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>{t('support.sendButton')}</Text>
                           <Feather name="send" size={18} color={theme === 'dark' ? '#000' : '#fff'} />
                        </>
                     )}
                  </TouchableOpacity>
               </View>
            </ScrollView>
         </KeyboardAvoidingView>
      </SafeAreaView>
   );
};

const ContactCard = ({ icon, title, subtitle, infoText, onPress, colors }: any) => (
   <TouchableOpacity
      style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
   >
      <View style={[styles.iconCircle, { backgroundColor: colors.inputBackground }]}>
         <Feather name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.cardSubtitle, { color: colors.text }]}>{subtitle}</Text>
      {infoText && (
         <View style={[styles.infoRow, { backgroundColor: colors.inputBackground }]}>
            <Feather name={icon === 'mail' ? 'clock' : 'calendar'} size={12} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{infoText}</Text>
         </View>
      )}
   </TouchableOpacity>
);

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
   scrollView: {
      flex: 1,
   },
   scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
   },
   heroSection: {
      marginVertical: 24,
   },
   heroTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 8,
   },
   heroSubtitle: {
      fontSize: 16,
      lineHeight: 24,
   },
   gridContainer: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 24,
   },
   contactCard: {
      flex: 1,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
      gap: 8,
   },
   iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
   },
   cardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
   },
   cardSubtitle: {
      fontSize: 12,
      textAlign: 'center',
   },
   formSection: {
      padding: 20,
      borderRadius: 24,
      borderWidth: 1,
      marginTop: 24,
      marginBottom: 24,
   },
   sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
   },
   inputContainer: {
      marginBottom: 16,
   },
   label: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
      marginLeft: 4,
   },
   inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      height: 50,
      borderRadius: 12,
      borderWidth: 1,
      gap: 12,
   },
   input: {
      flex: 1,
      fontSize: 16,
   },
   textAreaWrapper: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      height: 80,
   },
   textArea: {
      fontSize: 16,
      padding: 0,
      margin: 0,
      flex: 1,
   },
   submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 16,
      marginTop: 8,
      gap: 8,
   },
   submitButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
   },
   infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      gap: 6,
      marginTop: 4,
   },
   infoText: {
      fontSize: 10,
      fontWeight: '600',
   },
});

export default Support;