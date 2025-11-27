# PureMycelium

A professional inventory and sales management system built for modern businesses.

## Features

- 📦 **Inventory Management** - Track products, batches, and stock levels
- 👥 **Customer Management** - Maintain customer records and order history
- 🛒 **Order Processing** - Handle sales orders with payment integration
- 📊 **Reports & Analytics** - Gain insights into business performance
- 💳 **Payment Integration** - Process payments via Yoco
- 📄 **Invoice Generation** - Automated PDF invoice generation and delivery

## Technologies

This project is built with:

- **React** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality UI components
- **Supabase** - Backend and database
- **React Query** - Data fetching and caching
- **React Hook Form** - Form management
- **Zod** - Schema validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Supabase account and project setup

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd puremycelium

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Setup

Create a `.env.local` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
puremycelium/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom React hooks
│   ├── integrations/   # Third-party integrations
│   ├── lib/            # Utility functions
│   └── pages/          # Application pages
├── supabase/           # Supabase configuration and migrations
└── public/             # Static assets
```

## License

Copyright © 2025 PureMycelium. All rights reserved.
