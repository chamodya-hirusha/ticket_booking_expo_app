import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Event } from '../constants';
import { notificationService } from '../services/notifications';

interface FavoritesContextType {
    favorites: Event[];
    addFavorite: (event: Event) => void;
    removeFavorite: (eventId: string) => void;
    isFavorite: (eventId: string) => boolean;
    toggleFavorite: (event: Event) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [favorites, setFavorites] = useState<Event[]>([]);

    const addFavorite = (event: Event) => {
        setFavorites(prev => {
            if (!prev.find(e => e.id === event.id)) {
                // Show local notification and save to AsyncStorage when favorite is added
                notificationService.showLocalNotification(
                    'Event Added to Favorites',
                    `${event.name || 'Event'} has been added to your favorites.`,
                    'event',
                    { eventId: event.id, eventName: event.name }
                );
                return [...prev, event];
            }
            return prev;
        });
    };

    const removeFavorite = (eventId: string) => {
        setFavorites(prev => {
            const eventToRemove = prev.find(e => e.id === eventId);
            if (eventToRemove) {
                // Show local notification and save to AsyncStorage when favorite is removed
                notificationService.showLocalNotification(
                    'Event Removed from Favorites',
                    `${eventToRemove.name || 'Event'} has been removed from your favorites.`,
                    'event',
                    { eventId: eventToRemove.id, eventName: eventToRemove.name }
                );
            }
            return prev.filter(e => e.id !== eventId);
        });
    };

    const isFavorite = (eventId: string) => {
        return favorites.some(e => e.id === eventId);
    };

    const toggleFavorite = (event: Event) => {
        if (isFavorite(event.id)) {
            removeFavorite(event.id);
        } else {
            addFavorite(event);
        }
    };

    return (
        <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
};
