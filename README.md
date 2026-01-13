# 🎫 Ticket Booking Expo App

A premium, feature-rich mobile application designed for seamless event discovery and ticket booking. Built with **React Native** and **Expo**, this application showcases a modern "Cyberpunk" aesthetic with robust functionality including secure authentication, dynamic theming, and real-time ticket management.

---

## ✨ Key Features

### 🔐 Authentication & Security
- **Secure Sign-Up/Sign-In**: Robust authentication flow for user accounts.
- **Profile Management**: Edit profile details and manage account security settings.

### 🌍 Event Discovery
- **Browse Events**: Explore a wide range of events with rich details.
- **Search & Filter**: Easily find events that match your interests.
- **Favorites**: Save events to your personal wishlist for quick access.

### 🎟️ Ticket Management
- **Seamless Booking**: Intuitive flow for selecting and purchasing tickets.
- **My Tickets**: View all your active and past tickets in one place.
- **Ticket Validation**: Built-in screens for ticket details and validation status.

### 🎨 UI/UX Design
- **Cyberpunk Aesthetic**: A unique, high-contrast design language with neon accents.
- **Dynamic Theming**: Full support for Light and Dark modes via a custom Theme Context.
- **Custom Navigation**: A floating, glassmorphism-inspired bottom tab bar.
- **Responsive Layouts**: Optimized for various screen sizes and devices.

---

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Navigation**: [React Navigation](https://reactnavigation.org/) (Stack & Bottom Tabs)
- **State Management**: React Context API (Auth, Theme, Favorites)
- **Styling**: `StyleSheet`, `expo-linear-gradient`
- **Icons**: `@expo/vector-icons`

---

## 📂 Project Structure

```text
Mobile-app/
├── assets/             # Images, fonts, and static resources
├── context/            # Global state providers (Auth, Theme, Favorites)
├── screens/            # Application screens (Home, Profile, TicketDetail, etc.)
├── App.tsx             # Main entry point and Navigation configuration
├── app.json            # Expo configuration
├── constants.ts        # App-wide constants and configuration
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v16 or later)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go** app on your physical device (iOS/Android) OR an Emulator.

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Mobile-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the Application**
   ```bash
   npx expo start
   ```

### Running on Devices

- **Physical Device**: Scan the QR code displayed in the terminal using the **Expo Go** app.
- **Android Emulator**: Press `a` in the terminal window.
- **iOS Simulator**: Press `i` in the terminal window (macOS only).

---

## 📜 Available Scripts

| Script | Description |
| :--- | :--- |
| `npm start` | Starts the Expo development server. |
| `npm run android` | Runs the app on an Android emulator or connected device. |
| `npm run ios` | Runs the app on an iOS simulator (macOS only). |
| `npm run web` | Runs the app in a web browser. |
| `npm run build:android` | Builds the Android APK using EAS. |
| `npm run build:ios` | Builds the iOS app using EAS. |

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

---

## 📄 License

This project is licensed under the MIT License.
