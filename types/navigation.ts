import { Ticket } from '../constants';

export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  MainTabs: { screen?: string } | undefined;
  EventDetails: { eventId?: string; event?: any };
  TicketDetail: { ticket: Ticket };
  ConfirmPay: { reservationId: number; eventId: number; amount: number; ticketType: string; ticketCount: number };
  PaymentSuccess: { reservationId: number };
  EditProfile: undefined;
  Support: undefined;
  InvalidTicket: undefined;
  TicketSelection: { event: any };
  SeeAll: { type: string; title: string };
  Notifications: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  Favorites: undefined;
  Tickets: undefined;
  ProfileTab: undefined;
};
