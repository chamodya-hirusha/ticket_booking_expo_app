import shutil
import os

assets_dir = r"c:\Users\User\Documents\Next.js\ticket_booking_complete_project\Ticket-Booking-Expo-App\assets"
source = os.path.join(assets_dir, "WhatsApp Image 2026-02-25 at 4.17.05 AM.jpeg")
targets = ["logo.png", "icon.png", "splash.png", "adaptive-icon.png", "favicon.png"]

for target in targets:
    shutil.copy2(source, os.path.join(assets_dir, target))
    print(f"Copied to {target}")
