import React, { useState, useEffect } from 'react';
import {
   View,
   Text,
   StyleSheet,
   TextInput,
   TouchableOpacity,
   ScrollView,
   Alert,
   Modal,
   Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Professional avatar options with modern, clean styles
const AVATAR_OPTIONS = [
   { id: 1, uri: 'https://api.dicebear.com/7.x/notionists/png?seed=Felix&backgroundColor=3b82f6' },
   { id: 2, uri: 'https://api.dicebear.com/7.x/notionists/png?seed=Aneka&backgroundColor=8b5cf6' },
   { id: 3, uri: 'https://api.dicebear.com/7.x/notionists/png?seed=Luna&backgroundColor=ec4899' },
   { id: 4, uri: 'https://api.dicebear.com/7.x/notionists/png?seed=Max&backgroundColor=f59e0b' },
   { id: 5, uri: 'https://api.dicebear.com/7.x/notionists/png?seed=Sophie&backgroundColor=10b981' },
   { id: 6, uri: 'https://api.dicebear.com/7.x/notionists/png?seed=Oliver&backgroundColor=06b6d4' },
   { id: 7, uri: 'https://api.dicebear.com/7.x/thumbs/png?seed=Emma&backgroundColor=6366f1' },
   { id: 8, uri: 'https://api.dicebear.com/7.x/thumbs/png?seed=Leo&backgroundColor=14b8a6' },
   { id: 9, uri: 'https://api.dicebear.com/7.x/thumbs/png?seed=Mia&backgroundColor=f97316' },
   { id: 10, uri: 'https://api.dicebear.com/7.x/thumbs/png?seed=Jack&backgroundColor=a855f7' },
   { id: 11, uri: 'https://api.dicebear.com/7.x/thumbs/png?seed=Zoe&backgroundColor=0ea5e9' },
   { id: 12, uri: 'https://api.dicebear.com/7.x/thumbs/png?seed=Noah&backgroundColor=84cc16' },
];

const EditProfile = () => {
   const { colors, theme } = useTheme();
   const { user, updateProfile, refreshUser, isLoading: authLoading } = useAuth();
   const navigation = useNavigation();

   const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || AVATAR_OPTIONS[0].uri);
   const [isLoading, setIsLoading] = useState(false);
   const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
   const [isRefreshing, setIsRefreshing] = useState(false);

   useEffect(() => {
      const loadUserData = async () => {
         setIsRefreshing(true);
         await refreshUser();
         setIsRefreshing(false);
      };
      
      if (user) {
         loadUserData();
      }
   }, []);

   useEffect(() => {
      if (user?.avatar) {
         setSelectedAvatar(user.avatar);
      }
   }, [user?.avatar]);

   const handleSave = async () => {
      if (!user?.name) {
         Alert.alert('Error', 'User data not available');
         return;
      }

      setIsLoading(true);
      const success = await updateProfile(user.name, selectedAvatar);
      setIsLoading(false);

      if (success) {
         Alert.alert('Success', 'Avatar updated successfully', [
            {
               text: 'OK',
               onPress: () => navigation.goBack()
            }
         ]);
      } else {
         Alert.alert('Error', 'Failed to update avatar');
      }
   };

   const handleAvatarSelect = (avatarUri: string) => {
      setSelectedAvatar(avatarUri);
      setIsAvatarModalVisible(false);
   };

   return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
         {/* Header */}
         <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
               <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>View Profile</Text>
            <View style={styles.placeholder} />
         </View>

         <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Current Avatar */}
            <View style={styles.currentAvatarSection}>
               <TouchableOpacity
                  style={[styles.currentAvatarContainer, { borderColor: colors.primary }]}
                  onPress={() => setIsAvatarModalVisible(true)}
                  activeOpacity={0.8}
               >
                  <Image source={{ uri: selectedAvatar }} style={styles.currentAvatar} />
                  <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
                     <Feather name="camera" size={18} color={theme === 'dark' ? '#000' : '#fff'} />
                  </View>
               </TouchableOpacity>
               <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
                  Tap to change avatar
               </Text>
            </View>

            {/* Name (Read-only) */}
            <View style={styles.section}>
               <Text style={[styles.sectionTitle, { color: colors.text }]}>Name</Text>
               <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, opacity: 0.6 }]}>
                  <Feather name="user" size={20} color={colors.textSecondary} />
                  <TextInput
                     style={[styles.input, { color: colors.text }]}
                     value={user?.name || ''}
                     editable={false}
                  />
               </View>
               <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  Name cannot be changed
               </Text>
            </View>

            {/* Email (Read-only) */}
            <View style={styles.section}>
               <Text style={[styles.sectionTitle, { color: colors.text }]}>Email</Text>
               <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, opacity: 0.6 }]}>
                  <Feather name="mail" size={20} color={colors.textSecondary} />
                  <TextInput
                     style={[styles.input, { color: colors.text }]}
                     value={user?.email}
                     editable={false}
                  />
               </View>
               <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  Email cannot be changed
               </Text>
            </View>

            {/* Phone (Read-only) */}
            {user?.phone && (
               <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Phone</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, opacity: 0.6 }]}>
                     <Feather name="phone" size={20} color={colors.textSecondary} />
                     <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={user?.phone}
                        editable={false}
                     />
                  </View>
               </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
               style={[styles.saveButton, { backgroundColor: colors.primary }]}
               onPress={handleSave}
               disabled={isLoading || selectedAvatar === user?.avatar}
               activeOpacity={0.8}
            >
               <Text style={[styles.saveButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
                  {isLoading ? 'Saving...' : 'Save Avatar'}
               </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
         </ScrollView>

         {/* Avatar Selection Modal */}
         <Modal
            animationType="slide"
            transparent={true}
            visible={isAvatarModalVisible}
            onRequestClose={() => setIsAvatarModalVisible(false)}
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
                     <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Avatar</Text>
                     <TouchableOpacity onPress={() => setIsAvatarModalVisible(false)}>
                        <Feather name="x" size={24} color={colors.text} />
                     </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                     <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                        Select your favorite avatar
                     </Text>
                     <View style={styles.avatarGrid}>
                        {AVATAR_OPTIONS.map((avatar) => (
                           <TouchableOpacity
                              key={avatar.id}
                              style={[
                                 styles.avatarOption,
                                 {
                                    borderColor: selectedAvatar === avatar.uri ? colors.primary : colors.border,
                                    borderWidth: selectedAvatar === avatar.uri ? 3 : 1,
                                    backgroundColor: colors.surface
                                 }
                              ]}
                              onPress={() => handleAvatarSelect(avatar.uri)}
                              activeOpacity={0.7}
                           >
                              <Image source={{ uri: avatar.uri }} style={styles.avatarOptionImage} />
                              {selectedAvatar === avatar.uri && (
                                 <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                                    <Feather name="check" size={18} color={theme === 'dark' ? '#000' : '#fff'} />
                                 </View>
                              )}
                           </TouchableOpacity>
                        ))}
                     </View>
                  </ScrollView>
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
   placeholder: {
      width: 32,
   },
   scrollView: {
      flex: 1,
      paddingHorizontal: 20,
   },
   currentAvatarSection: {
      alignItems: 'center',
      paddingVertical: 32,
   },
   currentAvatarContainer: {
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 4,
      padding: 4,
      position: 'relative',
   },
   currentAvatar: {
      width: '100%',
      height: '100%',
      borderRadius: 66,
   },
   editBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
   },
   avatarHint: {
      fontSize: 14,
      marginTop: 12,
   },
   section: {
      marginBottom: 24,
   },
   sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 10,
   },
   inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 56,
      borderWidth: 1,
      gap: 12,
   },
   input: {
      flex: 1,
      fontSize: 16,
   },
   helperText: {
      fontSize: 12,
      marginTop: 8,
      marginLeft: 4,
   },
   saveButton: {
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
   },
   saveButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
   },
   modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.7)',
   },
   modalContent: {
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      padding: 24,
      height: '75%',
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
      marginBottom: 8,
   },
   modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
   },
   modalBody: {
      flex: 1,
   },
   modalSubtitle: {
      fontSize: 14,
      marginBottom: 20,
   },
   avatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'space-between',
   },
   avatarOption: {
      width: (width - 88) / 3,
      aspectRatio: 1,
      borderRadius: 20,
      overflow: 'hidden',
      position: 'relative',
   },
   avatarOptionImage: {
      width: '100%',
      height: '100%',
   },
   selectedBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
   },
});

export default EditProfile;