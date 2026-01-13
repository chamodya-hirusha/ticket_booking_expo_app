import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    FlatList,
    Dimensions,
    Modal,
    Platform
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getEventImageUrl } from '../constants';

const { width, height } = Dimensions.get('window');

const CATEGORIES = [
    { id: '1', name: 'All', icon: 'grid-outline' },
    { id: '2', name: 'Music', icon: 'musical-notes-outline' },
    { id: '3', name: 'Tech', icon: 'hardware-chip-outline' },
    { id: '4', name: 'Art', icon: 'color-palette-outline' },
    { id: '5', name: 'Gaming', icon: 'game-controller-outline' },
];

const FEATURED_EVENTS = [];

const POPULAR_EVENTS = [];

const Explore = () => {
    const { colors, theme } = useTheme();
    const navigation = useNavigation();
    const [selectedCategory, setSelectedCategory] = useState('1');
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterVisible, setIsFilterVisible] = useState(false);

    // Filter States
    const [priceRange, setPriceRange] = useState([0, 500]);
    const [selectedDate, setSelectedDate] = useState('Anytime');

    const renderCategory = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[
                styles.categoryChip,
                {
                    backgroundColor: selectedCategory === item.id ? colors.primary : colors.surface,
                    borderColor: selectedCategory === item.id ? colors.primary : colors.border
                }
            ]}
            onPress={() => setSelectedCategory(item.id)}
        >
            <Ionicons
                name={item.icon as any}
                size={18}
                color={selectedCategory === item.id ? '#000' : colors.textSecondary}
                style={{ marginRight: 6 }}
            />
            <Text
                style={[
                    styles.categoryText,
                    { color: selectedCategory === item.id ? '#000' : colors.textSecondary }
                ]}
            >
                {item.name}
            </Text>
        </TouchableOpacity>
    );

    const renderFeatured = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.featuredCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.9}
            onPress={() => (navigation as any).navigate('EventDetails', { event: item })}
        >
            <Image source={{ uri: getEventImageUrl(item.image) }} style={styles.featuredImage} />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={styles.featuredOverlay}
            >
                <View style={styles.featuredContent}>
                    <Text style={styles.featuredTitle}>{item.title}</Text>
                    <View style={styles.featuredRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                        <Text style={[styles.featuredInfo, { color: colors.textSecondary }]}>{item.date}</Text>
                    </View>
                    <View style={styles.featuredRow}>
                        <Ionicons name="location-outline" size={14} color={colors.primary} />
                        <Text style={[styles.featuredInfo, { color: colors.textSecondary }]}>{item.location}</Text>
                    </View>
                </View>
                <View style={[styles.priceTag, { backgroundColor: colors.primary }]}>
                    <Text style={styles.priceText}>{item.price}</Text>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    const renderPopular = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.popularCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => (navigation as any).navigate('EventDetails', { event: item })}
        >
            <Image source={{ uri: getEventImageUrl(item.image) }} style={styles.popularImage} />
            <View style={styles.popularContent}>
                <Text style={[styles.popularTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.popularDate, { color: colors.primary }]}>{item.date}</Text>
                <Text style={[styles.popularLocation, { color: colors.textSecondary }]} numberOfLines={1}>{item.location}</Text>
                <View style={styles.popularFooter}>
                    <Text style={[styles.popularPrice, { color: colors.text }]}>{item.price}</Text>
                    <TouchableOpacity style={[styles.bookButton, { backgroundColor: 'rgba(0, 255, 255, 0.1)' }]}>
                        <Text style={[styles.bookText, { color: colors.primary }]}>Book</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Explore</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Discover events near you</Text>
                    </View>
                    <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface }]}>
                        <Ionicons name="notifications-outline" size={24} color={colors.text} />
                        <View style={[styles.badge, { backgroundColor: colors.notification }]} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                        <Ionicons name="search" size={20} color={colors.textSecondary} />
                        <TextInput
                            placeholder="Search events, artists..."
                            placeholderTextColor={colors.textSecondary}
                            style={[styles.searchInput, { color: colors.text }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.filterButton, { backgroundColor: colors.primary }]}
                        onPress={() => setIsFilterVisible(true)}
                    >
                        <Ionicons name="options-outline" size={24} color="#000" />
                    </TouchableOpacity>
                </View>

                {/* Categories */}
                <View style={styles.categoriesContainer}>
                    <FlatList
                        data={CATEGORIES}
                        renderItem={renderCategory}
                        keyExtractor={item => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesList}
                    />
                </View>

                {/* Featured Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Events</Text>
                        <TouchableOpacity>
                            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={FEATURED_EVENTS}
                        renderItem={renderFeatured}
                        keyExtractor={item => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.featuredList}
                        snapToInterval={width * 0.8 + 20}
                        decelerationRate="fast"
                    />
                </View>

                {/* Popular Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Nearby</Text>
                        <TouchableOpacity>
                            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.popularList}>
                        {POPULAR_EVENTS.map(item => (
                            <View key={item.id} style={{ marginBottom: 16 }}>
                                {renderPopular({ item })}
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>

            {/* Advanced Search Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isFilterVisible}
                onRequestClose={() => setIsFilterVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Filter Events</Text>
                            <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {/* Date Filter */}
                            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Date</Text>
                            <View style={styles.filterOptions}>
                                {['Anytime', 'Today', 'Tomorrow', 'This Week'].map((option) => (
                                    <TouchableOpacity
                                        key={option}
                                        style={[
                                            styles.filterChip,
                                            {
                                                backgroundColor: selectedDate === option ? colors.primary : colors.inputBackground,
                                                borderColor: selectedDate === option ? colors.primary : colors.border
                                            }
                                        ]}
                                        onPress={() => setSelectedDate(option)}
                                    >
                                        <Text style={{ color: selectedDate === option ? '#000' : colors.text }}>{option}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Price Range */}
                            <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: 20 }]}>Price Range</Text>
                            <View style={[styles.priceInputContainer, { backgroundColor: colors.inputBackground }]}>
                                <Text style={{ color: colors.text }}>$0 - $500+</Text>
                            </View>

                            {/* Location */}
                            <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: 20 }]}>Location</Text>
                            <View style={[styles.locationInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                                <TextInput
                                    placeholder="Enter city or district"
                                    placeholderTextColor={colors.textSecondary}
                                    style={{ flex: 1, marginLeft: 10, color: colors.text }}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.resetButton, { borderColor: colors.border }]}
                                onPress={() => {
                                    setSelectedDate('Anytime');
                                    // Reset other filters
                                }}
                            >
                                <Text style={{ color: colors.text }}>Reset</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.applyButton, { backgroundColor: colors.primary }]}
                                onPress={() => setIsFilterVisible(false)}
                            >
                                <Text style={{ color: '#000', fontWeight: 'bold' }}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
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
    scrollContent: {
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#000',
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 24,
        gap: 12,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        borderRadius: 25,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    filterButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoriesContainer: {
        marginBottom: 24,
    },
    categoriesList: {
        paddingHorizontal: 20,
        gap: 10,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    seeAll: {
        fontSize: 14,
        fontWeight: '600',
    },
    featuredList: {
        paddingHorizontal: 20,
        gap: 20,
    },
    featuredCard: {
        width: width * 0.8,
        height: 200,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
    },
    featuredImage: {
        width: '100%',
        height: '100%',
    },
    featuredOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        justifyContent: 'flex-end',
        padding: 16,
    },
    featuredContent: {
        marginBottom: 8,
    },
    featuredTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    featuredRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 6,
    },
    featuredInfo: {
        fontSize: 12,
        fontWeight: '500',
    },
    priceTag: {
        position: 'absolute',
        top: 16,
        right: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    priceText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 14,
    },
    popularList: {
        paddingHorizontal: 20,
    },
    popularCard: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    popularImage: {
        width: 80,
        height: 80,
        borderRadius: 16,
    },
    popularContent: {
        flex: 1,
        marginLeft: 16,
    },
    popularTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    popularDate: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    popularLocation: {
        fontSize: 12,
        marginBottom: 8,
    },
    popularFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    popularPrice: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    bookButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    bookText: {
        fontSize: 12,
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
        padding: 20,
        height: '70%',
        borderWidth: 1,
        borderBottomWidth: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    modalBody: {
        flex: 1,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    priceInputContainer: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    locationInput: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 20,
        marginBottom: 20,
    },
    resetButton: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    applyButton: {
        flex: 2,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Explore;
