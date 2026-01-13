
import re

def clean_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        # Replace non-breaking spaces and other weird whitespace
        line = line.replace('\xa0', ' ')
        # Only keep lines that aren't just whitespace unless they were intended
        # But for now let's just keep them as is but cleaned of weird chars
        new_lines.append(line.rstrip() + '\n')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

clean_file(r'c:\Users\User\Documents\finale_projrct\ticket_booking_complete_project\Ticket-Booking-Expo-App\screens\Home.tsx')
