import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import pyautogui
import math
import time
import os
import urllib.request

# --- AUTO-DOWNLOAD THE AI BRAIN ---
model_path = os.path.join(os.path.dirname(__file__), 'hand_landmarker.task')

if not os.path.exists(model_path):
    print(f"Downloading AI model to {model_path}...")
    url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
    urllib.request.urlretrieve(url, model_path)
    print("Download complete! Starting camera...")
else:
    print(f"Model found at: {model_path}")
# ----------------------------------

# --- 1. SETUP & PATHS ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, 'hand_landmarker.task')

# --- 2. SETTINGS (This is what was missing!) ---
CLICK_THRESHOLD = 0.05  # Smaller = closer pinch required to click
SMOOTHING = 3           # Higher = smoother but slightly delayed cursor
pyautogui.PAUSE = 0     # Removes PyAutoGUI's default artificial delay
# -----------------------------------------------

# --- 3. INITIALIZE MEDIAPIPE ---
base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.VIDEO,
    num_hands=1
)
detector = vision.HandLandmarker.create_from_options(options)

# --- 4. SCREEN & STATE VARIABLES ---
screen_w, screen_h = pyautogui.size()
plocX, plocY = 0, 0
is_dragging = False

# --- 5. START CAMERA ---
cap = cv2.VideoCapture(0)

print("--- AIDAMATH VISION ACTIVE ---")
print("Pinch Index and Thumb to click/drag. Press 'q' in the video window to quit.")

while cap.isOpened():
    success, frame = cap.read()
    if not success: 
        break

    # Flip the frame so it acts like a mirror
    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape
    
    # Convert format for MediaPipe
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    
    # Detect landmarks
    timestamp = int(time.time() * 1000)
    result = detector.detect_for_video(mp_image, timestamp)

    if result.hand_landmarks:
        landmarks = result.hand_landmarks[0]
        
        # Index Tip (Landmark 8) and Thumb Tip (Landmark 4)
        index = landmarks[8]
        thumb = landmarks[4]

        # Coordinate Mapping (with margin so you can reach the edges of the screen)
        margin = 0.15
        x_mapped = (index.x - margin) / (1 - 2 * margin) * screen_w
        y_mapped = (index.y - margin) / (1 - 2 * margin) * screen_h

        # Smoothing to prevent jitter
        clocX = plocX + (x_mapped - plocX) / SMOOTHING
        clocY = plocY + (y_mapped - plocY) / SMOOTHING
        
        # Move the actual computer mouse
        try:
            pyautogui.moveTo(clocX, clocY)
        except pyautogui.FailSafeException:
            pass
            
        plocX, plocY = clocX, clocY

        # Pinch Logic
        dist = math.sqrt((index.x - thumb.x)**2 + (index.y - thumb.y)**2 + (index.z - thumb.z)**2)
        
        if dist < CLICK_THRESHOLD:
            if not is_dragging:
                pyautogui.mouseDown()
                is_dragging = True
            cv2.circle(frame, (int(index.x * w), int(index.y * h)), 15, (0, 255, 0), -1)
        else:
            if is_dragging:
                pyautogui.mouseUp()
                is_dragging = False
            cv2.circle(frame, (int(index.x * w), int(index.y * h)), 15, (255, 0, 255), -1)

    cv2.imshow("AIDAMATH Vision Eye", frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'): 
        break

cap.release()
cv2.destroyAllWindows()