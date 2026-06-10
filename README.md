# Scoreazy - Confidence Building Microcourse Platform 🚀

Welcome to the **Scoreazy Confidence Building Microcourse Platform**, a full-stack educational web application designed specifically for children! This platform empowers kids to speak up, participate, and grow their social skills through proven, engaging microcourses.

![Scoreazy Hero Image](public/background.jpg)

## 🌟 Key Features

*   **Modern, Responsive UI:** A beautiful, fully responsive interface that looks amazing on desktops, tablets, and mobile phones, featuring glassmorphism and custom micro-animations.
*   **Secure User Authentication:** 
    *   Sign up / Login with secure password hashing (bcrypt).
    *   Real-time email verification using NodeMailer and JWT tokens to prevent spam accounts.
*   **Interactive Recommendation Quiz:** A step-by-step wizard to help parents find the perfect course based on their child's age, personality, and goals.
*   **Parent Dashboard:** A sleek, slide-out mobile-friendly sidebar where parents can track course progress, view unlockable daily lessons, and download automatically generated certificates.
*   **Virtual Classroom Engine:** Structured curriculum delivery (Days 1–5) that unlocks sequentially to keep students engaged without overwhelming them.
*   **Integrated Billing/Checkout Simulation:** A seamless checkout form with coupon code validation and "fake" payment processing that instantly enrolls the user upon success.

## 🛠️ Technology Stack

*   **Frontend:** HTML5, CSS3 (Vanilla + Custom Animations), JavaScript (Vanilla ES6), MDB (Material Design for Bootstrap).
*   **Backend:** Node.js, Express.js.
*   **Database:** MongoDB (via Mongoose).
*   **Security & Auth:** JSON Web Tokens (JWT), bcrypt.js, express-rate-limit, DOMPurify.
*   **Email Services:** NodeMailer (configured for fast IPv4 SMTP delivery).

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and [MongoDB](https://www.mongodb.com/try/download/community) installed and running on your local machine.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/faiza-1040/scoreazy-platform.git
   cd scoreazy-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory and add your secret credentials:
   ```env
   PORT=3000
   MONGO_URI=mongodb://127.0.0.1:27017/scoreazy
   JWT_SECRET=your_super_secret_key
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Run the Server**
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:3000`.*

## 🔒 Security Note
This repository includes a `.gitignore` file that deliberately excludes the `.env` file and `node_modules`. Your sensitive email passwords and database URLs are safe and will never be pushed to GitHub!

---
*Built with ❤️ for the future speakers of tomorrow.*
