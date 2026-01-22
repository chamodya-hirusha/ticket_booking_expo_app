import { Event } from '../constants';

/**
 * Transforms raw event data from the API to handle both snake_case and camelCase fields,
 * and ensures all required fields for the Event interface are present.
 */
export const transformEvent = (eventData: any, eventId?: string | number): Event => {
    if (!eventData) {
        return {
            id: String(eventId || ''),
            name: 'Event',
            slug: '',
            description: '',
            location: '',
            date: '',
            startTime: '',
            vipTicketLimit: 0,
            premiumTicketLimit: 0,
            generalTicketLimit: 0,
            vipTicketPrice: 0,
            premiumTicketPrice: 0,
            generalTicketPrice: 0,
            eventCategory: '',
            eventStatus: 'SCHEDULED',
        };
    }

    // Helper to get value from multiple possible keys
    const getVal = (paths: string[]) => {
        for (const path of paths) {
            if (eventData[path] !== undefined && eventData[path] !== null) {
                return eventData[path];
            }
        }
        return undefined;
    };

    const ticketTypes = getVal(['ticketTypes']) || [];

    // Attempt to extract prices from ticketTypes if the explicit price fields are 0
    let vipPrice = Number(getVal(['vipTicketPrice', 'vip_ticket_price', 'vipPrice', 'vip_price']) || 0);
    let premiumPrice = Number(getVal(['premiumTicketPrice', 'premium_ticket_price', 'premiumPrice', 'premium_price']) || 0);
    let generalPrice = Number(getVal(['generalTicketPrice', 'general_ticket_price', 'generalPrice', 'general_price', 'price']) || 0);

    if (Array.isArray(ticketTypes)) {
        ticketTypes.forEach((tt: any) => {
            const name = String(tt.name || '').toUpperCase();
            if (name === 'VIP' && vipPrice === 0) vipPrice = tt.price;
            if (name === 'PREMIUM' && premiumPrice === 0) premiumPrice = tt.price;
            if (name === 'GENERAL' && generalPrice === 0) generalPrice = tt.price;
        });
    }

    return {
        ...eventData,
        id: String(getVal(['id', 'eventId']) || eventId || ''),
        name: getVal(['name', 'title', 'event_name']) || 'Event',
        slug: getVal(['slug', 'event_slug']) || '',
        description: getVal(['description', 'event_description']) || '',
        location: getVal(['location', 'venue', 'event_location']) || '',
        date: getVal(['date', 'event_date']) || '',
        startTime: getVal(['startTime', 'start_time', 'time']) || '',
        ticketTypes,

        // Ticket Prices
        vipTicketPrice: vipPrice,
        premiumTicketPrice: premiumPrice,
        generalTicketPrice: generalPrice,

        // Ticket Limits
        vipTicketLimit: Number(getVal(['vipTicketLimit', 'vip_ticket_limit', 'vipLimit', 'vip_limit']) || 0),
        premiumTicketLimit: Number(getVal(['premiumTicketLimit', 'premium_ticket_limit', 'premiumLimit', 'premium_limit']) || 0),
        generalTicketLimit: Number(getVal(['generalTicketLimit', 'general_ticket_limit', 'generalLimit', 'general_limit', 'limit']) || 0),

        eventCategory: getVal(['eventCategory', 'event_category', 'category']) || 'General',
        eventStatus: getVal(['eventStatus', 'event_status', 'status']) || 'SCHEDULED',
        image: getVal(['imageUrl', 'image_url', 'image']) || null,
    };
};

/**
 * Formats price in Euro (€)
 */
export const formatPrice = (price: number): string => {
    return `€${price.toLocaleString()}`;
};

/**
 * Gets the price range or single price display for an event in Euro
 */
export const getEventPriceDisplay = (event: Event): string => {
    const prices = [
        event.generalTicketPrice,
        event.premiumTicketPrice,
        event.vipTicketPrice
    ].filter(p => p > 0);

    if (prices.length === 0) return 'Free';

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
        return formatPrice(minPrice);
    }

    return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
};
