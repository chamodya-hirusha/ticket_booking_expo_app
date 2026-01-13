import React, { useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from './constants';
import './utils/silenceConsole';

// Dynamic import for Notifee
let notifee: any = null;
try {
  notifee = require('@notifee/react-native').default || require('@notifee/react-native');
} catch (error) {
  // Notifee not available
}

// Import screens
import Home from './screens/Home';
import Favorites from './screens/Favorites';
import EventDetails from './screens/EventDetails';
import MyTickets from './screens/MyTickets';
import TicketDetail from './screens/TicketDetail';
import ConfirmPay from './screens/ConfirmPay';
import PaymentSuccess from './screens/PaymentSuccess';
import Profile from './screens/Profile';
import EditProfile from './screens/EditProfile';
import Support from './screens/Support';
import InvalidTicket from './screens/InvalidTicket';
import TicketSelection from './screens/TicketSelection';
import SignIn from './screens/SignIn';
import SignUp from './screens/SignUp';
import SeeAll from './screens/SeeAll';
import Notifications from './screens/Notifications';

// Define navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();




const TabNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: colors.cardGradientStart, // Use theme color
          borderRadius: 25,
          height: 70,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          paddingBottom: 10,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 10,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.5,
          elevation: 5,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 5,
        },
        tabBarIconStyle: {
          marginTop: 5,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={Home}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={Favorites}
        options={{
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tickets"
        component={MyTickets}
        options={{
          tabBarLabel: 'Tickets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={Profile}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { colors, theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer
        theme={{
          dark: theme === 'dark',
          colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            notification: colors.notification,
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerShown: false,
          }}
        >
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="SignIn" component={SignIn} />
              <Stack.Screen name="SignUp" component={SignUp} />
            </>
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={TabNavigator} />
              <Stack.Screen name="EventDetails" component={EventDetails} />
              <Stack.Screen name="TicketDetail" component={TicketDetail} />
              <Stack.Screen name="ConfirmPay" component={ConfirmPay} />
              <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
              <Stack.Screen name="EditProfile" component={EditProfile} />
              <Stack.Screen name="Support" component={Support} />
              <Stack.Screen name="InvalidTicket" component={InvalidTicket} />
              <Stack.Screen name="TicketSelection" component={TicketSelection} />
              <Stack.Screen name="SeeAll" component={SeeAll} />
              <Stack.Screen name="Notifications" component={Notifications} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const App = () => {
  // Request notification permissions on app startup
  useEffect(() => {
    const requestPermissions = async () => {
      if (!notifee) {
        return;
      }

      try {
        await notifee.requestPermission();
      } catch (error) {
        // Error requesting Notifee notification permissions
      }
    };

    requestPermissions();
  }, []);

  return (
    <StripeProvider
      publishableKey={STRIPE_CONFIG.PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.ticketbooking" // Optional: required for Apple Pay
      urlScheme="ticketbooking" // Optional: required for 3D Secure and bank redirects
    >
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <NotificationProvider>
              <FavoritesProvider>
                <AppNavigator />
              </FavoritesProvider>
            </NotificationProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </StripeProvider>
  );
};

export default App;
