import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';
import { handleApiError } from '../utils/apiErrorHandler';
import { toast } from '../services/toast';

interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    role?: string;
    isVerified?: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; isVerified?: boolean }>;
    signUp: (name: string, email: string, password: string, phone: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
    updateProfile: (name: string, avatar: string) => Promise<boolean>;
    refreshUser: () => Promise<void>;
    completeSocialLogin: (token: string) => Promise<{ success: boolean; error?: string }>;
    handlePermissionError: () => Promise<void>;
    hasRole: (role: string) => boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('TOKEN');

            if (token) {
                const response = await apiService.user.getCurrentUser();

                if (response.success && response.data) {
                    let userData: any = response.data;

                    if (userData && typeof userData === 'object' && 'content' in userData && userData.content) {
                        userData = userData.content;
                    }

                    if (userData && typeof userData === 'object' && 'data' in userData && userData.data) {
                        userData = userData.data;
                    }

                    const user: User = {
                        id: userData.id?.toString() || '',
                        name: userData.name || '',
                        email: userData.email || '',
                        phone: userData.phone,
                        avatar: userData.avatar,
                        role: userData.role || 'USER',
                        isVerified: userData.isVerified ?? userData.verified ?? true,
                    };
                    await AsyncStorage.setItem('user', JSON.stringify(user));
                    setUser(user);
                } else {
                    const status = (response as any).data?._status || (response as any).status;

                    if (status === 401 || response.error?.toLowerCase().includes('token')) {
                        await clearAuthData();
                    } else {
                        const savedUser = await AsyncStorage.getItem('user');
                        if (savedUser) {
                            try {
                                setUser(JSON.parse(savedUser));
                            } catch (e) {
                                await clearAuthData();
                            }
                        } else {
                            await clearAuthData();
                        }
                    }
                }
            } else {
                await clearAuthData();
            }
        } catch (error) {
            const token = await AsyncStorage.getItem('TOKEN');
            if (!token) {
                await clearAuthData();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const clearAuthData = async () => {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('TOKEN');
        await apiService.removeToken();
        setUser(null);
    };

    const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string; isVerified?: boolean }> => {
        try {
            const response = await apiService.login(email, password);

            if (response.success && response.data) {
                const responseData = response.data as any;
                const loginData = responseData?.content || responseData;
                const userId = loginData.userId?.toString() || loginData.userId;

                const userResponse = await apiService.user.getCurrentUser();

                if (userResponse.success && userResponse.data) {
                    let userData: any = userResponse.data;

                    if (userData && typeof userData === 'object' && 'content' in userData && userData.content) {
                        userData = userData.content;
                    }

                    if (userData && typeof userData === 'object' && 'data' in userData && userData.data) {
                        userData = userData.data;
                    }

                    const isVerified = userData.isVerified ?? userData.verified ?? true;
                    const userRole = loginData.role || userData.role || 'USER';

                    const user: User = {
                        id: userId,
                        name: userData.name || loginData.username || '',
                        email: userData.email || email,
                        phone: userData.phone,
                        avatar: userData.avatar || `https://api.dicebear.com/7.x/notionists/png?seed=${userData.name || loginData.username}&backgroundColor=3b82f6`,
                        role: userRole,
                        isVerified: isVerified,
                    };

                    await AsyncStorage.setItem('user', JSON.stringify(user));
                    setUser(user);

                    return { success: true, isVerified };
                } else {
                    const userRole = loginData.role || 'USER';
                    const user: User = {
                        id: userId,
                        name: loginData.username || '',
                        email: email,
                        avatar: `https://api.dicebear.com/7.x/notionists/png?seed=${loginData.username}&backgroundColor=3b82f6`,
                        role: userRole,
                        isVerified: true,
                    };

                    await AsyncStorage.setItem('user', JSON.stringify(user));
                    setUser(user);

                    return { success: true, isVerified: true };
                }
            }

            const responseData = response.data as any;
            const status = responseData?._status;
            const errorMessage = handleApiError(response.data || response, status, false);

            const errorMsgLower = errorMessage.toLowerCase();
            const isUnverifiedError =
                errorMsgLower.includes('not verified') ||
                errorMsgLower.includes('verify your account') ||
                errorMsgLower.includes('unverified') ||
                errorMsgLower.includes('account not verified') ||
                (status === 500 && errorMsgLower.includes('verify')) ||
                responseData?.code === '05' ||
                (response as any).code === '05';

            if (isUnverifiedError) {
                return { success: false, error: errorMessage, isVerified: false };
            }

            return { success: false, error: errorMessage };
        } catch (error: any) {
            const errorMessage = handleApiError(error, undefined, false);
            const errorMsgLower = errorMessage.toLowerCase();
            const isUnverifiedError =
                errorMsgLower.includes('not verified') ||
                errorMsgLower.includes('verify your account') ||
                errorMsgLower.includes('unverified') ||
                errorMsgLower.includes('account not verified') ||
                errorMsgLower.includes('verify') ||
                error?.code === '05' ||
                error?.data?.code === '05';

            if (isUnverifiedError) {
                return { success: false, error: errorMessage, isVerified: false };
            }

            return { success: false, error: errorMessage };
        }
    };

    const signUp = async (name: string, email: string, password: string, phone: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await apiService.register(name, password, email, phone);

            if (response.success) {
                return { success: true };
            }

            const status = response.data?._status;
            const errorMessage = handleApiError(response.data || response, status, false);

            const errorMsgLower = errorMessage.toLowerCase();
            if (errorMsgLower.includes('email') &&
                (errorMsgLower.includes('already') ||
                    errorMsgLower.includes('duplicate') ||
                    errorMsgLower.includes('use') ||
                    errorMsgLower.includes('registered'))) {
                toast.error('Email already in use. Please use a different email.');
            } else {
                handleApiError(response.data || response, status, true);
            }

            return { success: false, error: errorMessage };
        } catch (error: any) {
            const errorMessage = handleApiError(error, undefined, true);
            return { success: false, error: errorMessage };
        }
    };

    const updateProfile = async (name: string, avatar: string): Promise<boolean> => {
        try {
            if (!user) return false;

            const response = await apiService.updateProfile(name, avatar);

            if (response.success && response.data) {
                const updatedUser: User = {
                    id: user.id,
                    name: response.data.name || name,
                    email: response.data.email || user.email,
                    phone: response.data.phone || user.phone,
                    avatar: response.data.avatar || avatar,
                    role: response.data.role || user.role,
                    isVerified: response.data.isVerified ?? response.data.verified ?? user.isVerified,
                };

                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    };

    const signOut = async () => {
        try {
            await apiService.signOut();
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('TOKEN');
            setUser(null);
        } catch (error) {
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('TOKEN');
            setUser(null);
        }
    };

    const refreshUser = async () => {
        try {
            const response = await apiService.user.getCurrentUser();
            if (response.success && response.data) {
                let userData: any = response.data;

                if (userData && typeof userData === 'object' && 'content' in userData && userData.content) {
                    userData = userData.content;
                }

                if (userData && typeof userData === 'object' && 'data' in userData && userData.data) {
                    userData = userData.data;
                }

                const updatedUser: User = {
                    id: userData.id?.toString() || user?.id || '',
                    name: userData.name || user?.name || '',
                    email: userData.email || user?.email || '',
                    phone: userData.phone || user?.phone,
                    avatar: userData.avatar || user?.avatar,
                    role: userData.role || user?.role || 'USER',
                    isVerified: userData.isVerified ?? userData.verified ?? user?.isVerified ?? true,
                };
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            } else {
                const status = (response as any).data?._status || (response as any).status;
                if (status === 401 || response.error?.toLowerCase().includes('token')) {
                    await signOut();
                    toast.error('Your session has expired. Please sign in again.');
                }
            }
        } catch (error) {
            // Error handled silently
        }
    };

    const completeSocialLogin = async (token: string): Promise<{ success: boolean; error?: string }> => {
        try {
            setIsLoading(true);
            await apiService.setToken(token);
            await refreshUser();
            return { success: true };
        } catch (error: any) {
            const errorMessage = handleApiError(error, undefined, false);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    const handlePermissionError = async () => {
        try {
            await refreshUser();
            const currentUser = await AsyncStorage.getItem('user');

            if (!currentUser || !user) {
                return;
            }

            if (user && !user.isVerified) {
                toast.error('Your account is not verified. Please verify your email to access all features.');
            } else {
                if (user && user.role !== 'USER' && user.role !== 'ADMIN' && user.role !== 'VENDOR') {
                    toast.error('Your account role is not recognized. Please contact support.');
                }
            }
        } catch (error) {
            await signOut();
            toast.error('Authentication error. Please sign in again.');
        }
    };

    const hasRole = (role: string): boolean => {
        if (!user || !user.role) {
            return false;
        }
        return user.role.toUpperCase() === role.toUpperCase();
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            signIn,
            signUp,
            signOut,
            updateProfile,
            refreshUser,
            completeSocialLogin,
            handlePermissionError,
            hasRole,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};