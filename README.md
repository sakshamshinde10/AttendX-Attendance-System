# 🎓 AttendX (BeaconAttend)
### Next-Generation Smart Anti-Proxy Attendance System with Dual-Factor Proximity Verification

---

## 📌 Executive Summary & Problem Statement

Traditional attendance methods in higher educational institutions and organizations suffer from critical security, efficiency, and integrity loopholes:
1. **Paper-Based Roll Calls**: Consumes 10–15 minutes of lecture time and is prone to human error and buddy punching.
2. **Static QR Codes**: Students snap photos of the QR code and forward them via WhatsApp or Telegram to absent friends, enabling remote proxy attendance from anywhere in the world.
3. **GPS-Only Geofencing**: Easily defeated using software-based GPS spoofing apps, VPNs, or mock location developer tools on Android/iOS.
4. **Manual Biometrics**: Causes physical crowding, hardware maintenance costs, and slow student throughput at classroom entrances.

**AttendX (BeaconAttend)** solves these challenges through a **zero-trust, dual-factor physical attestation architecture**. It pairs **high-frequency dynamic rotating QR codes (AES-256-CBC encrypted)** with **physical Bluetooth Low Energy (BLE) RSSI proximity handshakes** and **hardware device binding**. A student cannot mark attendance unless they are **physically present inside the lecture hall within 2 to 4 meters of the teacher's device**.

---

## 🛠️ Complete Technology Stack

| Layer | Technology | Purpose & Implementation Details |
|---|---|---|
| **Mobile Frontend** | **React Native (v0.76.9)** with **Expo SDK 52** | Cross-platform native mobile application built for high performance. |
| **Language** | **TypeScript (v5.3.3)** | Strict static typing across navigation, API payloads, BLE events, and state. |
| **Styling & UI** | **Vanilla CSS in JS / React Native StyleSheet** | Dark-themed, high-contrast, modern responsive UI design tokens. |
| **Animations** | **React Native Reanimated (v3.16.1)** | Smooth 60 FPS radar pulse animations, step indicators, and progress bars. |
| **Camera & Scanning**| **expo-camera (v16.0.18)** | High-speed QR scanning using native camera frames. |
| **QR Generation** | **react-native-qrcode-svg** | Renders dynamic SVG QR codes on the faculty screen every 25 seconds. |
| **BLE Hardware** | **react-native-ble-advertise** & **react-native-ble-plx** | Teacher device acts as a BLE Peripheral; Student device acts as a Central scanner. |
| **Offline Storage** | **AsyncStorage** | Persistent local queue for offline attendance records and cached sessions. |
| **State & Query** | **@tanstack/react-query (v5)** & React Context | Global state for authentication, real-time caching, and query management. |
| **Backend API** | **Node.js** & **Express.js** | Modular RESTful API server with route separation and custom middlewares. |
| **Real-time Comms** | **Socket.IO (v4)** | Bi-directional WebSocket communication for live attendance count streaming. |
| **Database** | **Supabase (PostgreSQL)** & **MongoDB / Mongoose** | Dual-driver architecture for relational academic schemas and attendance logs. |
| **Cryptography** | **Node.js Crypto Engine** | AES-256-CBC encryption for QR tokens and HMAC-SHA256 for BLE payload signing. |
| **PDF & Reports** | **expo-print** & **expo-sharing** | Client-side generation and sharing of official attendance PDF and CSV audit sheets. |
| **Build Toolchain** | **Android Gradle 8.10.2**, **Java 21**, **Android SDK 34** | Local standalone release APK generation with ProGuard / R8 optimization. |

---

## 🔄 System Architecture & Data Flow

```
   ┌───────────────────────────────────────────────────────────┐
   │                     FACULTY DEVICE                        │
   │  1. Starts Lecture Session (Subject, Year, Div)           │
   │  2. Starts BLE Peripheral Broadcast (Session UUID)        │
   │  3. Displays AES-256 Dynamic QR (Rotates every 25 sec)    │
   └───────────────┬───────────────────────────┬───────────────┘
                   │                           │
         [BLE Beacon Broadcast]       [Visible Dynamic QR]
         (Physical Range ~3m)         (Screen Display)
                   │                           │
                   ▼                           ▼
   ┌───────────────────────────────────────────────────────────┐
   │                     STUDENT DEVICE                        │
   │  Step 1: Scans BLE Peripheral -> Validates RSSI >= -70dBm  │
   │  Step 2: Scans Camera QR -> Extracts Encrypted Token      │
   │  Step 3: Collects Device Fingerprint Hardware ID          │
   └───────────────────────────┬───────────────────────────────┘
                               │
            [POST /api/attendance/mark Payload]
                               │
                               ▼
   ┌───────────────────────────────────────────────────────────┐
   │                     BACKEND SERVER                        │
   │  1. Decrypts QR Token with AES-256-CBC                    │
   │  2. Verifies Token Expiry (Current Time vs expiresAt)     │
   │  3. Verifies Cryptographic Nonce (Replay Attack Defense)  │
   │  4. Calculates Log-Distance BLE Distance from RSSI (dBm)  │
   │  5. Evaluates Multi-Factor Attestation Score (0 - 100)    │
   │  6. Validates Academic Enrollment & Duplicate Prevention  │
   └───────────────────────────┬───────────────────────────────┘
                               │
            [Socket.IO Instant Notification]
                               ▼
   ┌───────────────────────────────────────────────────────────┐
   │            FACULTY LIVE DASHBOARD & DATABASE              │
   │  - Real-time present count increments instantly          │
   │  - Attendance record saved in PostgreSQL / MongoDB        │
   └───────────────────────────────────────────────────────────┘
```

---

## 🔬 In-Depth Feature Breakdown (How Everything Works)

### 1. Dynamic Rotating QR Code Engine (Replay & Photo-Sharing Prevention)

#### The Problem:
If a QR code is static, a student sitting in class can take a photo with their camera, send it to a messaging group, and 50 absent students can scan it from their homes.

#### The AttendX Solution:
* **Cryptographic Payload**: Each QR code contains an encrypted token generated on the server using **AES-256-CBC**:
  $$\text{Payload} = \{ \text{sessionId}, \text{nonce}, \text{issuedAt}, \text{expiresAt} \}$$
  * `nonce`: A cryptographically random UUIDv4 generated uniquely for every QR cycle.
  * `issuedAt`: Server timestamp in milliseconds.
  * `expiresAt`: $\text{issuedAt} + 25\text{ seconds}$.
* **Initialization Vector (IV)**: A unique, cryptographically random 16-byte IV is generated for *every single token*. The exported token string format is:
  $$\text{Token} = \text{Hex}(\text{IV}) + ":" + \text{Hex}(\text{Ciphertext})$$
* **Strict 25-Second Time-To-Live (TTL)**:
  * On `ActiveQRScreen.tsx`, an automated timer triggers `attendanceApi.refreshQR(sessionId)` every 25 seconds.
  * The backend invalidates the old token and issues a new one.
  * When a student submits a scan, the backend decrypts the payload and checks:
    $$\text{scannedAt} \le \text{expiresAt} + \text{GracePeriod}(10\text{s})$$
  * **Result**: Photos taken and forwarded via social media arrive expired and fail verification immediately.

---

### 2. Dual-Factor Bluetooth Low Energy (BLE) Proximity Attestation

#### The Problem:
Even with a 25-second QR code, an absent student on a live video call or screen-share might scan the code within 10 seconds.

#### The AttendX Solution:
AttendX requires **physical radio-frequency verification** over Bluetooth Low Energy.

* **Teacher Device as BLE Peripheral**:
  * When the teacher begins a session, the app activates `bleAdvertiser.startAdvertising(sessionUUID)`.
  * It broadcasts a 128-bit session-specific Service UUID over Bluetooth advertising channels (Company ID `0x00E0`).
* **Student Device as BLE Central Scanner**:
  * Before opening the QR camera, the student app enters step `BLE_VERIFY`.
  * It initiates a native BLE scan for the teacher's `sessionUUID` using `react-native-ble-plx`.
  * It reads the **RSSI** (Received Signal Strength Indicator in dBm).
* **Mathematical Distance Estimation (Log-Distance Path Loss Model)**:
  The system computes the physical distance between student and teacher using the electromagnetic RF propagation equation:
  $$d = 10^{\frac{P_{\text{tx}} - \text{RSSI}}{10 \cdot n}}$$
  * $P_{\text{tx}}$: Transmit power at 1 meter distance (calibrated at $-59\text{ dBm}$).
  * $\text{RSSI}$: Measured signal strength received by the student's antenna (typically $-45\text{ dBm}$ to $-85\text{ dBm}$).
  * $n$: Path loss exponent of an indoor classroom environment (set to $2.5$).
* **Threshold Enforcement**:
  * Signal strength $\ge -70\text{ dBm}$ ($\sim 2\text{ to }3.5\text{ meters}$): **Classroom Proximity Confirmed**.
  * Signal strength $< -70\text{ dBm}$ or missing beacon: **Rejected**. A student standing outside the door or in another room cannot pass this barrier.

---

### 3. Multi-Factor Attestation Scoring Engine (SWAS Engine)

Located in `backend/services/security.service.js`, the server does not rely on a naive binary switch. It calculates a weighted **Security Verification Score (0–100)**:

$$\text{Score} = S_{\text{BLE}} (40\%) + S_{\text{QR}} (40\%) + S_{\text{Device}} (20\%) - P_{\text{Risk}}$$

#### Factor Scoring Weights:
1. **BLE Proximity (Max 40 Points)**:
   * $\text{RSSI} \ge -60\text{ dBm}$: $40\text{ pts}$ (Direct proximity, within 1–2m)
   * $\text{RSSI} \ge -70\text{ dBm}$: $35\text{ pts}$ (Good proximity, within 2–3m)
   * $\text{RSSI} \ge -80\text{ dBm}$: $20\text{ pts}$ (Perimeter of room)
   * Failed / Absent: $0\text{ pts}$
2. **Dynamic QR Freshness (Max 40 Points)**:
   * Token age $\le 10\text{ seconds}$: $40\text{ pts}$
   * Token age $\le 25\text{ seconds}$: $30\text{ pts}$
   * Token age near grace cutoff: $20\text{ pts}$
   * Expired / Tampered: $0\text{ pts}$
3. **Hardware Device Binding (Max 20 Points)**:
   * Matches student's pre-registered `deviceId`: $20\text{ pts}$
   * Unregistered / New device: $0\text{ pts}$
4. **Security Risk Penalties ($P_{\text{Risk}}$)**:
   * Mock Location / Fake GPS detected: $-30\text{ pts}$
   * Root / Jailbreak hooks detected: $-20\text{ pts}$
   * Emulator execution (BlueStacks, Genymotion): $-40\text{ pts}$

#### Verdict Thresholds:
* **Score $\ge 75$**: `PRESENT` (Automatically recorded and verified).
* **Score $50 - 74$**: `FLAGGED` (Suspicious signal; logged for faculty review).
* **Score $< 50$**: `REJECTED` (Attendance denied).

---

### 4. Offline Queue & Idempotent Auto-Synchronization

Located in `src/services/offlineQueue.ts`, this feature guarantees zero lost attendance records during poor classroom Wi-Fi or cellular blackouts.

```
 [Student Scans in Classroom without Internet]
                     │
                     ▼
          [Network Probe Fails]
                     │
                     ▼
    [Saved to Local AsyncStorage Queue]
    Key: @beaconattend_offline_queue
    Payload: { id, sessionId, qrToken, bleRSSI, deviceId, timestamp }
                     │
                     ▼
          [Network Restored Later]
                     │
                     ▼
     [autoSyncIfOnline() Triggered]
                     │
                     ▼
     [POST /api/attendance/mark Loop]
   ┌─────────────────┴─────────────────┐
   │                                   │
[Status 200 / 201]             [Status 409 / 422 Conflict]
   │                                   │
(New sync success)             (Already marked on server)
   │                                   │
   └───────────────┬───────────────────┘
                   ▼
     [Safe Dequeue from AsyncStorage]
         (Prevents Duplicates)
```

* **Network Reachability Probe**: Uses a zero-dependency 3-second `HEAD` request against the API base URL to verify real connectivity without requiring unstable external modules.
* **Idempotent Deduplication**: If an offline record was already registered or collides with an existing record, the server responds with HTTP `409 Conflict` or `{ alreadyMarked: true }`. The queue catches this and smoothly dequeues the entry without throwing fatal user errors.

---

### 5. Real-Time WebSockets (`Socket.IO`) Integration

* The backend instantiates a `Socket.IO` server attached to Express.
* When the teacher opens `ActiveQRScreen`, their device emits `join_session(sessionId)`.
* Every time a student successfully marks attendance, the controller triggers:
  ```javascript
  req.io.to(`session_${sessionId}`).emit('attendance_marked', {
    studentId,
    name,
    rollNumber,
    timestamp,
    presentCount,
  });
  ```
* The teacher's screen updates the live counter and attendee avatar list with **zero page reloads**.

---

## 🗄️ Database Schemas & Data Models

### 1. `AttendanceSession`
Represents an active or closed lecture session:
* `id` (UUID / ObjectId): Primary key.
* `faculty_id`: Reference to teacher user.
* `subject_id`, `department_id`, `year`, `division`: Academic hierarchy.
* `ble_uuid`: 128-bit unique BLE identifier broadcasted during the lecture.
* `qr_token`: Current active AES-256 encrypted QR string.
* `is_active`: Boolean flag indicating if scans are currently accepted.
* `created_at`, `ended_at`: Timestamp range of the lecture.

### 2. `AttendanceRecord`
The immutable audit entry for each student's attendance:
* `id`: Unique record ID.
* `session_id`: Linked lecture session.
* `student_id`: Linked student account.
* `verification_score`: Calculated SWAS score ($0 - 100$).
* `ble_rssi`: Recorded Bluetooth signal strength in dBm.
* `distance_meters`: Calculated physical distance from teacher.
* `device_id`: Hardware fingerprint of the device used.
* `status`: `present` | `flagged` | `absent`.
* `marked_at`: Timestamp of attendance.

### 3. `User`
* `id`, `name`, `email`, `role` (`student` | `faculty` | `admin`).
* `roll_number`, `department`, `year`, `division`.
* `bound_device_id`: Unique identifier binding the student account to a single smartphone.

---

## 🚀 Setup & Execution Guide

### Prerequisites
* **Node.js**: v18.x or v20.x
* **JDK**: OpenJDK 17 or Oracle JDK 21
* **Android SDK**: Build tools 34.0.0
* **Package Manager**: npm or yarn

### 1. Backend Setup
```bash
cd BeaconAttend/backend
npm install
# Configure environment variables in backend/.env
npm run dev
```

### 2. Mobile App Development
```bash
cd BeaconAttend
npm install
npx expo start
```

### 3. Compiling the Standalone Android Release APK
The project includes a fully pre-configured native Android project with custom Gradle wrapper:
```bash
cd BeaconAttend/android
.\gradlew.bat clean
.\gradlew.bat assembleRelease
```
The compiled, signed release APK is generated at:
`BeaconAttend/android/app/build/outputs/apk/release/app-release.apk`
*(Also accessible at the project root as `AttendX.apk`)*.

---

## 🎓 Examiner Q&A Defense Guide (Top Viva Questions)

### Q1: Why did you choose Bluetooth Low Energy (BLE) instead of GPS Geofencing?
**Answer**:
> *"GPS signals attenuate severely indoors and typically have an error margin of 10 to 30 meters, making it impossible to distinguish whether a student is inside classroom 301 or standing in the hallway or the cafeteria next door. Furthermore, GPS coordinates can be easily spoofed using Android Mock Location apps. In contrast, BLE operates on 2.4 GHz RF signals, allowing physical proximity measurement via RSSI. An RSSI threshold of -70 dBm guarantees physical presence within a 2 to 4 meter radius inside the room."*

### Q2: What prevents a student from screenshotting the QR code and sending it via WhatsApp?
**Answer**:
> *"Two independent layers prevent this. First, our QR codes are dynamic and expire every 25 seconds using AES-256 encryption with a unique cryptographic nonce and timestamp. By the time a student screenshots and forwards the image, the token has expired on the server. Second, even if forwarded instantly, the remote student's app will attempt a BLE scan for the teacher's physical Bluetooth beacon. Because the remote student is not physically near the teacher, the BLE handshake fails, and attendance is rejected."*

### Q3: How does the system handle poor or non-existent internet connectivity in classrooms?
**Answer**:
> *"We implemented an offline FIFO queue engine backed by AsyncStorage. If a student's phone cannot reach the API, the encrypted QR scan, BLE RSSI value, and device fingerprint are securely queued locally. Once the device re-establishes connectivity, an automatic idempotent sync process runs in the background. If duplicate requests reach the server, the backend returns a 409 Conflict, which the client handles smoothly without duplicate record creation."*

### Q4: Can a student log into their friend's account on their phone to mark double attendance?
**Answer**:
> *"No. The system incorporates Hardware Device Binding. Upon first login, the student's unique smartphone hardware ID is bound to their academic profile in the database. When an attendance request is submitted, the server compares the payload's device ID against the registered profile. A mismatch triggers a penalty in the SWAS scoring engine and flags or rejects the attempt."*

### Q5: What is the Log-Distance Path Loss model you used?
**Answer**:
> *"The Log-Distance Path Loss model estimates the distance $d$ based on radio frequency signal attenuation: $d = 10^{\frac{P_{\text{tx}} - \text{RSSI}}{10 \cdot n}}$. We calibrated the transmitter power $P_{\text{tx}}$ to -59 dBm at 1 meter, and selected an indoor path loss exponent $n = 2.5$, which represents typical classroom obstacles like desks and human bodies."*

---

## 👥 Contributors & Academic Credits
* **Project Name**: AttendX 
* **Target Domain**: Smart Campus, IoT in Education, Anti-Proxy Proximity Attestation

