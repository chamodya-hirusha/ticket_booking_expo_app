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

const Support = () => {
   const navigation = useNavigation();
   const { colors, theme } = useTheme();
   const { user } = useAuth();
   
   const [name, setName] = useState(user?.name || '');
   const [email, setEmail] = useState(user?.email || '');
   const [subject, setSubject] = useState('');
   const [message, setMessage] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
   
   // Validation
   const validateForm = () => {
      if (!name.trim()) {
         Alert.alert('Validation Error', 'Please enter your name.');
         return false;
      }
      if (name.trim().length < 2) {
         Alert.alert('Validation Error', 'Name must be at least 2 characters.');
         return false;
      }
      if (!email.trim()) {
         Alert.alert('Validation Error', 'Please enter your email.');
         return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
         Alert.alert('Validation Error', 'Please enter a valid email address.');
         return false;
      }
      if (!subject.trim()) {
         Alert.alert('Validation Error', 'Please enter a subject.');
         return false;
      }
      if (subject.trim().length < 3) {
         Alert.alert('Validation Error', 'Subject must be at least 3 characters.');
         return false;
      }
      if (!message.trim()) {
         Alert.alert('Validation Error', 'Please enter your message.');
         return false;
      }
      if (message.trim().length < 10) {
         Alert.alert('Validation Error', 'Message must be at least 10 characters.');
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
               'Message Sent',
               response.message || 'Thank you for contacting us. We will get back to you shortly.',
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
               'Error',
               response.error || response.message || 'Failed to send message. Please try again.'
            );
         }
      } catch (error: any) {
         Alert.alert(
            'Error',
            error?.message || 'An error occurred while sending your message. Please try again.'
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Support</Text>
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
                  <Text style={[styles.heroTitle, { color: colors.text }]}>How can we help?</Text>
                  <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                     We're here to help you with any questions or issues you might have.
                  </Text>
               </View>

               {/* Contact Options */}
               <View style={styles.gridContainer}>
                  <ContactCard
                     icon="mail"
                     title="Email Us"
                     subtitle="Get a response within 24h"
                     onPress={() => Linking.openURL('mailto:support@ticketapp.com')}
                     colors={colors}
                  />
                  <ContactCard
                     icon="phone"
                     title="Call Us"
                     subtitle="Mon-Fri from 9am to 5pm"
                     onPress={() => Linking.openURL('tel:+1234567890')}
                     colors={colors}
                  />
               </View>

               {/* FAQ Link */}
               <TouchableOpacity
                  style={[styles.faqCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
               >
                  <View style={[styles.iconCircle, { backgroundColor: colors.inputBackground }]}>
                     <Feather name="help-circle" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.faqContent}>
                     <Text style={[styles.faqTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
                     <Text style={[styles.faqSubtitle, { color: colors.textSecondary }]}>Find answers to common questions</Text>
                  </View>
                  <Feather name="chevron-right" size={24} color={colors.textSecondary} />
               </TouchableOpacity>

               {/* Message Form */}
               <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Send a Message</Text>

                  <View style={styles.inputContainer}>
                     <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
                     <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <Feather name="user" size={20} color={colors.textSecondary} />
                        <TextInput
                           style={[styles.input, { color: colors.text }]}
                           placeholder="Your name"
                           placeholderTextColor={colors.placeholder}
                           value={name}
                           onChangeText={setName}
                           editable={!isSubmitting}
                        />
                     </View>
                  </View>

                  <View style={styles.inputContainer}>
                     <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
                     <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <Feather name="mail" size={20} color={colors.textSecondary} />
                        <TextInput
                           style={[styles.input, { color: colors.text }]}
                           placeholder="Your email"
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
                     <Text style={[styles.label, { color: colors.textSecondary }]}>Subject</Text>
                     <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <Feather name="file-text" size={20} color={colors.textSecondary} />
                        <TextInput
                           style={[styles.input, { color: colors.text }]}
                           placeholder="Message subject"
                           placeholderTextColor={colors.placeholder}
                           value={subject}
                           onChangeText={setSubject}
                           editable={!isSubmitting}
                        />
                     </View>
                  </View>

                  <View style={styles.inputContainer}>
                     <Text style={[styles.label, { color: colors.textSecondary }]}>Message</Text>
                     <View style={[styles.textAreaWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <TextInput
                           style={[styles.textArea, { color: colors.text }]}
                           placeholder="Describe your issue..."
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
                           <Text style={[styles.submitButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>Send Message</Text>
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

const ContactCard = ({ icon, title, subtitle, onPress, colors }: any) => (
   <TouchableOpacity
      style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
   >
      <View style={[styles.iconCircle, { backgroundColor: colors.inputBackground }]}>
         <Feather name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
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
   faqCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      gap: 16,
   },
   faqContent: {
      flex: 1,
   },
   faqTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
   },
   faqSubtitle: {
      fontSize: 12,
   },
});

export default Support;