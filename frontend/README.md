# Muyacon - Task Management App

A modern React Native app for connecting customers with service providers for various tasks.

## 🚀 Features

- **User Authentication** - Phone number verification with SMS
- **Task Management** - Post, browse, and apply to tasks
- **Real-time Chat** - Communicate with task providers/customers
- **Rating System** - Rate and review completed tasks
- **Profile Management** - Edit profiles with image upload
- **Task Categories** - Organized by service type
- **Location Services** - Find nearby tasks and providers

## 🛠️ Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Supabase** for backend and database
- **React Navigation** for navigation
- **Expo Router** for file-based routing

## 📱 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/berbir12/muyacon1
   cd muyacon1/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the frontend directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the database setup SQL (see Database Setup section)

5. **Start the development server**
   ```bash
   npx expo start
   ```

## 🗄️ Database Setup

Run this SQL in your Supabase SQL Editor to create all required tables:

```sql
-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    technician_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasker_applications table
CREATE TABLE IF NOT EXISTS tasker_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    experience_years INTEGER DEFAULT 0,
    skills TEXT[],
    bio TEXT,
    portfolio_images TEXT[],
    certifications TEXT[],
    languages TEXT[],
    hourly_rate DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissive RLS policies
CREATE POLICY "ratings_all_access" ON ratings FOR ALL USING (true);
CREATE POLICY "messages_all_access" ON messages FOR ALL USING (true);
CREATE POLICY "tasker_applications_all_access" ON tasker_applications FOR ALL USING (true);
```

## 📱 App Structure

```
frontend/
├── app/                    # Screen components
│   ├── auth.tsx           # Authentication screen
│   ├── index.tsx          # Home screen
│   ├── jobs.tsx           # Tasks listing
│   ├── post-task.tsx      # Create new task
│   ├── profile.tsx        # User profile
│   └── ...
├── components/            # Reusable components
├── contexts/              # React contexts
├── services/              # API services
├── constants/             # App constants
└── lib/                   # Utilities
```

## 🔧 Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

### Key Services

- **AuthContext** - Manages user authentication state
- **TaskService** - Handles task operations
- **ChatService** - Manages real-time messaging
- **ProfileService** - User profile management
- **SimpleSMSService** - SMS verification (development mode)

## 🚀 Deployment

### Building for Production

1. **Configure app.json** with your app details
2. **Build the app**:
   ```bash
   npx expo build:android
   npx expo build:ios
   ```

### Environment Setup

Make sure to configure:
- Supabase project settings
- App signing certificates
- Push notification keys
- App store listings

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For support, email support@muyacon.com or create an issue on GitHub.