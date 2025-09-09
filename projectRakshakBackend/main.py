import os
import cv2
import numpy as np
import threading
import time
import hashlib
import requests
import base64
import json
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from ultralytics import YOLO
from insightface.app import FaceAnalysis
from scipy.spatial.distance import cosine
from dotenv import load_dotenv
from typing import List
from starlette.responses import StreamingResponse

load_dotenv()

# ---------------------- CONFIGURATION ----------------------
MONGO_URI = os.getenv("MONGO_URI")
NODE_API_URL = "http://192.168.90.37:3000/persons/api/report_match"
CAMERA_SOURCES = [0, 1]
SIMILARITY_THRESHOLD = 0.5
DETECTION_INTERVAL = 10
VERIFICATION_THRESHOLD = 0.6
DUPLICATE_THRESHOLD = 0.7
MAX_IMAGE_SIZE = 800

# ---------------------- INITIALIZATION ----------------------
app = FastAPI(title="Rakshak AI Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# --- Database & AI Models ---
try:
    client = MongoClient(MONGO_URI)
    db = client['rakshak']
    people_collection = db['people']
    print("MongoDB connected successfully for AI Service.")
except Exception as e:
    print(f"AI Service DB Error: {e}"); exit()

print("Initializing AI models...")
yolo_model = YOLO('yolo11n.pt')
face_app = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0)
print("AI models initialized.")

# --- Global In-memory Face Database ---
db_faces = []
pending_matches = set()
permanently_found_ids = set()
db_lock = threading.Lock()
latest_frames = {}
frame_locks = {cam_id: threading.Lock() for cam_id in CAMERA_SOURCES}

# ---------------------- CORE FUNCTIONS ----------------------

def resize_image(image, max_size=MAX_IMAGE_SIZE):
    """Resizes an image for faster AI processing."""
    try:
        h, w = image.shape[:2]
        if max(h, w) > max_size:
            if h > w: new_h, new_w = max_size, int(w * (max_size / h))
            else: new_w, new_h = max_size, int(h * (max_size / w))
            return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
        return image
    except Exception:
        return image

def load_existing_faces():
    """
    OPTIMIZED: This function is now lightning-fast.
    It only fetches pre-calculated embeddings for people with 'Lost' status.
    """
    print("Loading pre-calculated embeddings for 'Lost' persons...")
    with db_lock:
        db_faces.clear()
        permanently_found_ids.clear()
        # --- THIS IS THE FIX (Part 1) ---
        # We add "status": "Lost" to the query filter.
        cursor = people_collection.find(
            {"status": "Lost", "embeddings": {"$exists": True, "$not": {"$size": 0}}},
            {"_id": 1, "fullName": 1, "embeddings": 1}
        )
        for doc in cursor:
            mongo_id = str(doc['_id'])
            for emb in doc.get('embeddings', []):
                db_faces.append({
                    'mongo_id': mongo_id,
                    'name': doc.get('fullName', 'Unknown'),
                    'embedding': np.array(emb, dtype=np.float32)
                })
    print(f"--- Initial load complete. Total embeddings in active search: {len(db_faces)} ---")

# --- NEW: REAL-TIME WATCHER FUNCTION ---
# --- THIS FUNCTION IS NOW CORRECTED ---
def watch_for_db_changes():
    """
    Watches MongoDB for new people and adds them to the live search list
    ONLY if their status is 'Lost'.
    """
    pipeline = [{'$match': {'operationType': 'insert'}}]
    with people_collection.watch(pipeline) as stream:
        print("[Watcher] Monitoring MongoDB for new inserts...")
        for change in stream:
            new_doc = change['fullDocument']
            # THE FIX: We explicitly check if the new person's status is 'Lost'
            if new_doc.get('status') == 'Lost':
                print(f"[Watcher] Detected new 'Lost' person: {new_doc['fullName']}")
                mongo_id = str(new_doc['_id'])
                with db_lock:
                    for emb in new_doc.get('embeddings', []):
                        db_faces.append({
                            'mongo_id': mongo_id,
                            'name': new_doc.get('fullName'),
                            'embedding': np.array(emb, dtype=np.float32)
                        })
                print(f"[Watcher] Added {len(new_doc.get('embeddings', []))} new embeddings to live search.")

def capture_and_process_stream(camera_id):
    """The main processing loop for a single camera, running in a dedicated thread."""
    cap = cv2.VideoCapture(camera_id)
    cam_name = f"Camera C{camera_id + 1}"
    if not cap.isOpened():
        print(f"!!! FATAL: Could not open {cam_name}. Creating 'No Signal' placeholder. !!!")
        no_signal_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(no_signal_frame, "No Signal", (220, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        _, buffer = cv2.imencode('.jpg', no_signal_frame)
        with frame_locks[camera_id]:
            latest_frames[camera_id] = buffer.tobytes()
        return

    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            print(f"{cam_name}: Failed to capture frame. Retrying...")
            cap.release(); time.sleep(2); cap = cv2.VideoCapture(camera_id)
            continue
        
        frame_count += 1
        with db_lock:
            current_db_faces = list(db_faces)
        
        if frame_count % DETECTION_INTERVAL == 0 and current_db_faces:
            results = yolo_model(frame, verbose=False)[0]
            for box in results.boxes:
                if int(box.cls[0]) == 0:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    face_crop = frame[y1:y2, x1:x2]
                    if face_crop.size == 0: continue
                    faces = face_app.get(face_crop)
                    if faces:
                        live_embedding = faces[0].embedding
                        best_match_name, best_match_id, best_similarity = "Unknown", None, 0
                        for db_face in current_db_faces:
                            if db_face['mongo_id'] in permanently_found_ids or db_face['mongo_id'] in pending_matches:
                                continue
                            similarity = 1 - cosine(live_embedding, db_face['embedding'])
                            if similarity > SIMILARITY_THRESHOLD and similarity > best_similarity:
                                best_similarity, best_match_name, best_match_id = similarity, db_face['name'], db_face['mongo_id']
                        
                        if best_match_id:
                            print(f"[MATCH_DETECTED] Match found on {cam_name}: {best_match_name} (ID: {best_match_id})")
                            
                            # Add to pending matches BEFORE making the request
                            pending_matches.add(best_match_id)
                            
                            try:
                                # Prepare the snapshot
                                thumbnail = cv2.resize(face_crop, (200, 200), interpolation=cv2.INTER_AREA)
                                _, buffer = cv2.imencode('.jpg', thumbnail)
                                snapshot_b64 = base64.b64encode(buffer).decode('utf-8')
                                
                                # Prepare the payload
                                payload = {
                                    "mongo_id": best_match_id,
                                    "name": best_match_name,
                                    "snapshot": snapshot_b64,
                                    "camera_name": cam_name
                                }
                                
                                print(f"[API_CALL] Sending match report to Node.js server at {NODE_API_URL}")
                                print(f"[API_CALL] Payload: mongo_id={best_match_id}, name={best_match_name}, camera={cam_name}")
                                
                                # Make the HTTP request with detailed error handling
                                response = requests.post(NODE_API_URL, json=payload, timeout=5)
                                
                                # Check if request was successful
                                if response.status_code == 200:
                                    print(f"[API_SUCCESS] Successfully reported match for {best_match_name} to Node.js server")
                                    print(f"[API_SUCCESS] Server response: {response.text}")
                                else:
                                    print(f"[API_ERROR] Server returned status {response.status_code}: {response.text}")
                                    # Remove from pending matches on server error
                                    pending_matches.discard(best_match_id)
                                    
                            except requests.exceptions.Timeout:
                                print(f"[API_TIMEOUT] Timeout while reporting match for {best_match_name}. Server may be down.")
                                pending_matches.discard(best_match_id)
                                
                            except requests.exceptions.ConnectionError as e:
                                print(f"[API_CONNECTION_ERROR] Could not connect to Node.js server at {NODE_API_URL}")
                                print(f"[API_CONNECTION_ERROR] Error details: {str(e)}")
                                pending_matches.discard(best_match_id)
                                
                            except requests.exceptions.RequestException as e:
                                print(f"[API_REQUEST_ERROR] HTTP request failed for {best_match_name}: {str(e)}")
                                pending_matches.discard(best_match_id)
                                
                            except Exception as e:
                                print(f"[GENERAL_ERROR] Unexpected error while processing match for {best_match_name}: {str(e)}")
                                pending_matches.discard(best_match_id)
                        
                        color = (0, 255, 0) if best_match_id else (0, 0, 255)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(frame, best_match_name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        (flag, encodedImage) = cv2.imencode(".jpg", frame)
        if flag:
            with frame_locks[camera_id]:
                latest_frames[camera_id] = encodedImage.tobytes()

# ---------------------- API ENDPOINTS ----------------------

@app.post("/verify_faceset")
async def verify_faceset(images: List[UploadFile] = File(...)):
    """
    Performs the complete 4-step verification:
    1. Checks image count.
    2. Checks for one face per image.
    3. Checks that all faces in the submission are the same person.
    4. Checks that the person is not a duplicate of someone already in the DB.
    """
    # Step 1: Check if the number of images is correct
    if not (3 <= len(images) <= 7):
        raise HTTPException(status_code=400, detail=f"Invalid number of images. Expected 3-7, got {len(images)}.")

    embeddings = []
    for idx, file in enumerate(images):
        try:
            contents = await file.read()
            npimg = np.frombuffer(contents, np.uint8)
            image = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
            
            resized_image = resize_image(image)
            detected_faces = face_app.get(resized_image)
            
            # Step 2: Check for exactly one face per image
            if len(detected_faces) == 0:
                raise HTTPException(status_code=400, detail=f"No face detected in image {idx + 1} ({file.filename}).")
            if len(detected_faces) > 1:
                raise HTTPException(status_code=400, detail=f"More than one face detected in image {idx + 1} ({file.filename}).")
                
            embeddings.append(detected_faces[0].embedding.astype('float32'))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing image {idx + 1}: {str(e)}")
    
    # Step 3: Check if all faces in the submission belong to the same person
    reference_embedding = embeddings[0]
    for i in range(1, len(embeddings)):
        similarity = 1 - cosine(reference_embedding, embeddings[i])
        if similarity < VERIFICATION_THRESHOLD:
            raise HTTPException(status_code=400, detail=f"The face in image {i + 1} does not appear to be the same person as in the first image.")
    
    # Step 4: Check if this person is a duplicate of someone already in the database
    with db_lock:
        current_db_faces = list(db_faces) # Create a copy for safe iteration

    for db_face in current_db_faces:
        similarity = 1 - cosine(reference_embedding, db_face['embedding'])
        if similarity > DUPLICATE_THRESHOLD:
            raise HTTPException(status_code=400, detail=f"This person appears to be a duplicate of '{db_face['name']}' who is already in the system.")
    
    # If all checks pass, return success and the calculated embeddings
    embeddings_as_list = [emb.tolist() for emb in embeddings]
    
    return {
        "success": True, 
        "message": "Verification successful.",
        "embeddings": embeddings_as_list
    }

@app.get("/video_feed/{camera_id}")
def video_feed(camera_id: int):
    if camera_id not in CAMERA_SOURCES:
        raise HTTPException(status_code=404, detail="Invalid Camera ID")
    def frame_generator(cam_id):
        while True:
            time.sleep(0.05)
            with frame_locks[cam_id]:
                frame = latest_frames.get(cam_id)
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    return StreamingResponse(frame_generator(camera_id), media_type='multipart/x-mixed-replace; boundary=frame')

@app.post("/update_search_status")
def update_search_status(data: dict):
    person_id, action = data.get('mongo_id'), data.get('action')
    if person_id and action:
        with db_lock:
            if action == "accept":
                permanently_found_ids.add(person_id)
                db_faces[:] = [face for face in db_faces if face.get('mongo_id') != person_id]
                if person_id in pending_matches: pending_matches.remove(person_id)
                print(f"Action 'accept' for {person_id}. Permanently removed from live search.")
            elif action == "research":
                if person_id in pending_matches: pending_matches.remove(person_id)
                print(f"Action 'research' for {person_id}. Re-enabling search for this instance.")
        return {"status": "ok"}
    raise HTTPException(status_code=400, detail="Invalid data")

@app.post("/verify_resolve_photo")
async def verify_resolve_photo(image: UploadFile = File(...), embeddings_str: str = Form(...)):
    """Verifies if the face in a new photo matches a set of known embeddings."""
    try:
        print("[RESOLVE_PY] 1. Endpoint started.")
        
        # 1. Read and validate the new photo
        print("[RESOLVE_PY] 2. Reading uploaded image file...")
        contents = await image.read()
        npimg = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        if img is None: raise HTTPException(status_code=400, detail="Invalid image file.")
        print("[RESOLVE_PY] 3. Image read successfully. Detecting face...")

        resized_image = resize_image(img)
        detected_faces = face_app.get(resized_image)
        if len(detected_faces) == 0: raise HTTPException(status_code=400, detail="No face was detected in the submitted photo.")
        if len(detected_faces) > 1: raise HTTPException(status_code=400, detail="Multiple faces were detected.")
        print("[RESOLVE_PY] 4. Single face detected successfully.")

        new_embedding = detected_faces[0].embedding.astype('float32')

        # 2. Load the original person's embeddings
        print(f"[RESOLVE_PY] 5. Parsing embeddings string: {embeddings_str[:100]}...") # Log first 100 chars
        original_embeddings = json.loads(embeddings_str)
        if not original_embeddings: raise HTTPException(status_code=400, detail="Original embeddings not provided.")
        print("[RESOLVE_PY] 6. Embeddings parsed successfully.")

        # 3. Compare the new face to the original ones
        reference_embedding = np.array(original_embeddings[0], dtype=np.float32)
        similarity = 1 - cosine(new_embedding, reference_embedding)
        print(f"[RESOLVE_PY] 7. Comparison complete. Similarity score: {similarity:.2f}")

        if similarity > VERIFICATION_THRESHOLD:
            return {"match": True, "message": "Verification successful. Faces match."}
        else:
            return {"match": False, "message": "Verification failed. The person in the photo does not match."}

    except Exception as e:
        print(f"!!! [RESOLVE_PY_CRITICAL_ERROR] An error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"An internal error occurred in the AI service: {e}")

    
@app.on_event("startup")
def startup_event():
    """
    This function now loads initial faces AND starts the real-time watcher thread.
    """
    load_existing_faces()
    watcher_thread = threading.Thread(target=watch_for_db_changes, daemon=True)
    watcher_thread.start()
    for cam_id in CAMERA_SOURCES:
        thread = threading.Thread(target=capture_and_process_stream, args=(cam_id,), daemon=True)
        thread.start()
    print("All camera threads started and are processing in the background.")

@app.get("/health")
def health_check():
    return {"status": "ok"}