# Freediving Philippines Web App

![Freediving Philippines Banner](https://raw.githubusercontent.com/jarielbalberona/freediving.ph/refs/heads/main/app/public/images/freedivingph-blue-transparent.png)
_A social platform built for freedivers, by freedivers._

## 🌊 About the Project

Freediving Philippines is an open-source social web app designed for the growing freediving community in the Philippines. Inspired by Instagram, Pinterest, and Reddit, this platform provides a space for divers to connect, share experiences, and explore new dive sites across the country.

## ✨ Features

### 🏠 **Social Features**

- **Profiles** – Showcase your dives, share your best records, and post your freediving adventures.
- **Messaging** – Connect with freedivers directly through private messaging.
- **Buddies & Groups** – Find dive buddies and create/join freediving groups.
- **Chika (Forum)** – Start and engage in discussions, including anonymous threads.

### 🌍 **Diving-Specific Features**

- **Explore** – Discover and contribute dive sites on an interactive map.
- **Buddy Finder** – See available dive buddies at specific locations.
- **Events** – Organize and join public freediving events.
- **Competitive Records** – Show off your PBs and national records in competitions like AIDA.

## 🔧 Tech Stack

- **Frontend:** Next.js 15, React Query, Tailwind CSS
- **Backend:** Node.js, Express, PostgreSQL
- **Authentication:** JWT + Session-based auth
- **Deployment:** Vercel (Frontend), DigitalOcean/AWS (Backend)

## 🚀 Getting Started

### **1. Clone the Repository**

```sh
 git clone https://github.com/jarielbalberona/freediving.ph.git
 cd freediving.ph
```

### **2. Install Dependencies**

cd to each folder

```sh
  npm install
```

### **3. Set Up Environment Variables**

Create a `.env.local` file and add the following:

```env
  NEXT_PUBLIC_API_URL=https://api.freedivingph.com
  DATABASE_URL=your-database-url
  JWT_SECRET=your-secret-key
  // check example envs
```

### **4. Run the Development Server**

in the root folder

```sh
  docker compose up
```

## 🤝 Contributing

Freediving Philippines is **open source** and welcomes contributions from the community! If you're a **developer**, feel free to fork the repo and submit PRs. We're also open to **feature suggestions**—just create an issue in the GitHub repo.

### **How to Contribute**

1. **Fork** the repository.
2. Create a **new branch** for your feature.
3. Commit your changes with a meaningful message.
4. Submit a **pull request** for review.

## 📢 Looking for Developers!

We're actively looking for **software developers** to help build and improve the platform. If you're interested in contributing, reach out or start contributing right away!

## 📬 Contact & Community

- **Email:** jariel@saltandsun.life
- **Reddit:** [Join our subreddit](https://reddit.com/r/fredivingph)
- **GitHub Issues:** [Report bugs & request features](https://github.com/jarielbalberona/freediving.ph/issues)

**Let's build the best freediving platform in the Philippines together! 🌊🐬**
