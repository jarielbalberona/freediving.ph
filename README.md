# Freediving Philippines Web App

![Freediving Philippines Banner](https://raw.githubusercontent.com/jarielbalberona/freediving.ph/refs/heads/main/apps/web/public/images/freedivingph-blue-transparent.png)
_A social platform built for freedivers, by freedivers._

## 🌊 About the Project

Freediving Philippines is an open-source social web app designed for the growing freediving community in the Philippines. Inspired by Instagram, Pinterest, and Reddit, this platform provides a space for divers to connect, share experiences, and explore new dive sites across the country.

## ✨ Features

### 🏠 **Social Features**

- **Profiles** – Showcase your dives, share your best records, and post your freediving adventures.
- **Messaging** – Connect with freedivers directly through private messaging.
- **Buddies & Groups** – Find dive buddies and create/join freediving groups.
- **Chika (Forum)** – Start and engage in discussions, including anonymous threads.
- **Authentication** – Secure user authentication powered by Clerk.

### 🌍 **Diving-Specific Features**

- **Explore** – Discover and contribute dive sites on an interactive map.
- **Buddy Finder** – See available dive buddies at specific locations.
- **Events** – Organize and join public freediving events.
- **Competitive Records** – Show off your PBs and national records in competitions like AIDA.

## 🔧 Tech Stack

- **Frontend:** Next.js 15, React Query, Zustand, Tailwind CSS
- **Backend:** Node.js, Express, Drizzle ORM, PostgreSQL
- **Authentication:** Clerk
- **Deployment:** CI/CD ~ GitHub Actions
- **Cloud Provider:** AWS, ECS, RDS, Route53, & S3
- **Infrastructure:** Terraform (Multi-Environment)

## 👥 Multi-Environment Terraform Setup

The infrastructure is managed using Terraform with support for multiple environments.

### **Terraform Services**

- **ECS (Elastic Container Service)** – Hosts both the Express backend and Next.js frontend applications.
- **RDS (Relational Database Service)** – PostgreSQL database instance for storing application data.
- **Route 53** – Domain management for subdomains and DNS configurations.
- **S3** – Used for storing images and assets.
- **Secrets Manager** – Secure storage for database credentials and application secrets.

## 🚀 Getting Started

### **1. Clone the Repository**

```sh
 git clone https://github.com/jarielbalberona/freediving.ph.git
 cd freediving.ph
```

### **2. Set Up Environment Variables**

Create a `.env` file and add the following:

```env
  NEXT_PUBLIC_API_URL=https://api.dev.freediving.ph
  DATABASE_URL=your-database-url
  CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
  CLERK_SECRET_KEY=your-clerk-secret-key
  // check example envs
```

### **3. Install Dependencies (Monorepo)**

```sh
  pnpm install
```

### **4. Run the Development Server**

in the root folder

```sh
  pnpm dev
```

Or run with Docker:

```sh
  docker compose up
```

## 🧱 Monorepo Structure

```txt
apps/
  api/     # Express API
  web/     # Next.js app
packages/
  db/      # Shared DB package scaffold
  types/   # Shared types/contracts
  config/  # Shared configuration/constants
  utils/   # Shared utility helpers
  ui/      # Shared UI package scaffold
```

## 🛠️ Workspace Scripts

```sh
pnpm dev          # run apps in parallel
pnpm build        # build packages then apps
pnpm typecheck    # type-check all workspaces
pnpm lint         # lint all workspaces
pnpm dev:web      # run Next.js app only
pnpm dev:api      # run API only
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

- **Email:** admin@freediving.ph
- **Reddit:** [Join our subreddit](https://reddit.com/r/fredivingph)
- **GitHub Issues:** [Report bugs & request features](https://github.com/jarielbalberona/freediving.ph/issues)

**Let's build the best freediving platform in the Philippines together! 🌊🐬**
