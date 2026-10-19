# টিআর পোল্ট্রি এন্ড হ্যাচারি — Deploy Guide

## প্রথমবার Setup (শুধু একবার করতে হবে)

### ধাপ ১ — Node.js install (না থাকলে)
https://nodejs.org থেকে LTS version download করো।

### ধাপ ২ — Firebase CLI install
```bash
npm install -g firebase-tools
```

### ধাপ ৩ — Firebase login
```bash
firebase login
```
Browser খুলবে — Google account দিয়ে login করো।

### ধাপ ৪ — Firebase Console-এ করো
1. https://console.firebase.google.com → tr000515 project
2. **Authentication** → Get Started → Enable করো:
   - Email/Password ✅
   - Google ✅
3. **Firestore Database** → Create Database → Production mode → Start
4. **Rules** tab-এ এটা paste করো:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /businesses/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
5. Publish করো।

---

## Deploy করো (প্রতিবার update-এর সময়)

এই folder-এ terminal/command prompt খুলে:

```bash
# ১. Dependencies install (প্রথমবার)
npm install

# ২. Build করো
npm run build

# ৩. Firebase-এ deploy করো
firebase deploy --only hosting
```

Deploy শেষে একটা URL দেবে, যেমন:
`https://tr000515.web.app`

ঐ URL-এ তোমার app চলবে! যেকোনো device থেকে।

---

## Local-এ test করতে চাইলে

```bash
npm run dev
```
Browser-এ যাও: http://localhost:5173

---

## প্রথমবার app খুললে

1. Email + Password দিয়ে **Register** করো (মালিকের account)
2. বা Google দিয়ে login করো
3. একবার login হলে সব device-এ sync হবে

---

## সমস্যা হলে

**"Firebase: Error (auth/..."** → Firebase Console-এ Authentication enable আছে কিনা দেখো

**Firestore permission error** → Rules ঠিকমতো paste হয়েছে কিনা দেখো

**Build error** → `npm install` আবার run করো
