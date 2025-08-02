# 💬 Enterprise Chat Application

A production-ready, full-stack real-time chat application built with modern web technologies. Features advanced messaging capabilities, comprehensive file storage, intelligent message organization, and enterprise-grade user management.

## ✨ Core Features

### 🔐 Authentication & Security
- **JWT Authentication** - Secure token-based authentication with HTTP-only cookies
- **Password Security** - bcrypt hashing with configurable salt rounds
- **Session Management** - Persistent login sessions with automatic token refresh
- **Profile Management** - User profile updates with Cloudinary integration

### 💬 Advanced Messaging System  
- **Real-time Communication** - Bidirectional messaging powered by Socket.io
- **Message Threading** - Reply to specific messages with contextual display
- **Message Status Tracking** - Real-time delivery and read receipts
- **Optimistic UI Updates** - Instant message display with rollback on failure
- **Auto-cleanup** - Scheduled deletion of messages older than 7 days

### 🏷️ Intelligent Message Organization
- **Workflow Tags** - 10 predefined message categories for business communication:
  - `@taskRequest` - Task assignments and work requests
  - `@statusUpdate` - Project progress and status reports  
  - `@clarificationNeeded` - Questions requiring clarification
  - `@deadlineReminder` - Time-sensitive notifications
  - `@bugReport` - Technical issues and bug reports
  - `@messageAcknowledged` - Confirmation and acknowledgment
  - `@urgentNotice` - High-priority communications
  - `@meetingSchedule` - Meeting coordination
  - `@infoSharing` - Information dissemination
  - `@workFeedback` - Performance and work evaluation

- **Metadata System** - Key-value pairs for additional message context
- **Execution Graph Panel** - Visual workflow tracking and tag-based filtering
- **Message Linking** - Reference and connect related messages

### 📁 Multi-Storage File System
- **GridFS Integration** - Large file storage (up to 100MB) directly in MongoDB
- **Cloudinary CDN** - Image optimization, transformation, and global delivery
- **Local Fallback** - Disk storage for development and backup scenarios
- **File Streaming** - Efficient download and serving of large files
- **Progress Tracking** - Real-time upload progress with cancellation support
- **Format Support** - Images, documents, videos, and custom file types

### 👥 Social Network Features
- **Friend System** - Send, accept, reject, and manage friend connections
- **User Discovery** - Search users by username or display name
- **Online Presence** - Real-time online/offline status indicators
- **Friend Requests** - Complete request lifecycle management
- **User Profiles** - Comprehensive user information and customization

### 🎨 User Experience
- **Responsive Design** - Optimized layouts for desktop, tablet, and mobile
- **Theme System** - Dark and light mode with persistent preferences
- **Loading States** - Skeleton screens and progressive loading
- **Error Handling** - Graceful error recovery with user-friendly messages
- **Toast Notifications** - Non-intrusive feedback system
- **Keyboard Shortcuts** - Power user navigation and actions

### 🔧 System Administration
- **Scheduled Tasks** - Automated maintenance using node-cron
- **Socket Management** - Connection pooling and automatic reconnection
- **File Validation** - Comprehensive size, type, and security checks
- **CORS Security** - Configurable cross-origin resource sharing
- **Environment Management** - Flexible configuration for multiple deployments

## 🏗️ Architecture

### Backend Stack
- **Node.js** - Server-side JavaScript runtime
- **Express.js** - Web application framework with middleware support
- **MongoDB** - Document database with GridFS for file storage
- **Mongoose** - ODM with schema validation and population
- **Socket.io** - Real-time bidirectional communication
- **JWT** - Stateless authentication tokens
- **bcryptjs** - Password hashing and verification
- **Multer** - Multipart form data handling
- **node-cron** - Task scheduling and automation
- **Cloudinary** - Cloud-based media management

### Frontend Stack  
- **React 18** - Component-based UI with concurrent features
- **Vite** - Next-generation build tool with HMR
- **TailwindCSS** - Utility-first CSS framework
- **DaisyUI** - Semantic component library
- **Zustand** - Lightweight state management with persistence
- **React Router** - Declarative routing with code splitting
- **Socket.io Client** - Real-time client-side communication
- **Axios** - HTTP client with request/response interceptors
- **React Hot Toast** - Toast notification system
- **Lucide React** - Modern SVG icon library
- **date-fns** - Date manipulation and formatting

### Development Tools
- **ESLint** - Code linting with React and modern JS rules
- **Nodemon** - Development server with auto-restart
- **dotenv** - Environment variable management

## 🚀 Quick Start

## 🔐 Security Setup (IMPORTANT!)

Before running this application:

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Generate secure secrets:**
   - `JWT_SECRET`: Must be at least 32 characters (use online generator)
   - `COOKIE_SECRET`: Strong random string
   - Update MongoDB URI for your database

3. **Verify .gitignore:**
   - ✅ `.env` files are excluded
   - ✅ `node_modules/` are excluded  
   - ✅ `uploads/` directory is excluded

⚠️ **Never commit `.env` files or upload them to GitHub!**

### Prerequisites
- **Node.js** 16+ and npm
- **MongoDB** (local or Atlas)
- **Cloudinary** account for media handling

### Installation

```bash
# Clone repository
git clone <repository-url>
cd fullstack-chat-app-master

# Install dependencies for all packages
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Environment Configuration

**SECURITY IMPORTANT**: Copy `.env.example` to `.env` and update with your actual values:

```bash
cp .env.example .env
```

**Required Environment Variables:**
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: **Must be at least 32 characters** - use a strong, random secret
- `COOKIE_SECRET`: Secure secret for cookie signing

**Optional (for image uploads):**
- Cloudinary credentials (leave empty to disable image uploads)

**Frontend Environment (optional):**
Create `frontend/.env` if deploying to a different domain:
```env
VITE_API_URL=https://your-backend-domain.com
```

⚠️ **Never commit your `.env` file to version control!**

### Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

Access the application:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5001
- **File Serving**: http://localhost:5001/api/files/{fileId}

### Production Build

```bash
# Build and start
npm run build
npm start
```

## 📁 Project Structure

```
chat-app/
├── backend/                     # Node.js API server
│   ├── src/
│   │   ├── controllers/         # Route handlers and business logic
│   │   │   ├── auth.controller.js      # Authentication operations
│   │   │   ├── message.controller.js   # Message CRUD and real-time
│   │   │   └── users.controller.js     # User management and friends
│   │   ├── middleware/          # Request processing middleware
│   │   │   ├── auth.middleware.js      # JWT verification
│   │   │   └── protectRoute.js         # Route protection
│   │   ├── models/              # Database schemas and validation
│   │   │   ├── user.model.js           # User schema with friends
│   │   │   ├── message.model.js        # Message schema with tags
│   │   │   └── friendship.model.js     # Friend relationship schema
│   │   ├── routes/              # API endpoint definitions
│   │   │   ├── auth.route.js           # Authentication endpoints
│   │   │   ├── message.route.js        # Messaging endpoints
│   │   │   ├── file.route.js           # File upload/download
│   │   │   ├── direct.route.js         # Direct messaging
│   │   │   └── users.route.js          # User operations
│   │   ├── lib/                 # Core utilities and services
│   │   │   ├── db.js                   # Database connection
│   │   │   ├── gridfs.js               # GridFS file operations
│   │   │   ├── socket.js               # Socket.io server setup
│   │   │   ├── cloudinary.js           # Cloudinary configuration
│   │   │   ├── scheduledTasks.js       # Cron job definitions
│   │   │   ├── multerConfig.js         # File upload configuration
│   │   │   └── utils.js                # Helper functions
│   │   ├── seeds/               # Database seeding scripts
│   │   └── index.js             # Application entry point
│   └── uploads/                 # Local file storage (development)
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ChatContainer.jsx       # Main chat interface
│   │   │   ├── MessageInput.jsx        # Message composition
│   │   │   ├── Message.jsx             # Message display logic
│   │   │   ├── Sidebar.jsx             # Contact list and navigation
│   │   │   ├── ExecutionGraphPanel.jsx # Workflow visualization
│   │   │   ├── Navbar.jsx              # Top navigation
│   │   │   └── skeletons/              # Loading placeholders
│   │   ├── pages/               # Full page components
│   │   │   ├── HomePage.jsx            # Main application layout
│   │   │   ├── LoginPage.jsx           # User authentication
│   │   │   ├── SignUpPage.jsx          # User registration
│   │   │   ├── ProfilePage.jsx         # User profile management
│   │   │   ├── AddFriendPage.jsx       # Friend discovery
│   │   │   ├── FriendRequestsPage.jsx  # Friend request management
│   │   │   └── SettingsPage.jsx        # Application settings
│   │   ├── store/               # State management
│   │   │   ├── useAuthStore.js         # Authentication state
│   │   │   ├── useChatStore.js         # Chat and messaging state
│   │   │   ├── useFriendStore.js       # Social features state
│   │   │   └── useThemeStore.js        # UI theme preferences
│   │   ├── lib/                 # Utilities and configurations
│   │   │   ├── axios.js                # HTTP client setup
│   │   │   └── utils.js                # Helper functions
│   │   └── main.jsx             # React application entry
│   └── public/                  # Static assets
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── LICENSE                      # MIT license
└── package.json                 # Root package configuration
```

## 🔧 Scripts

### Root Level
- `npm run build` - Build complete application for production
- `npm start` - Start production server

### Backend (`/backend`)
- `npm run dev` - Development server with auto-reload
- `npm start` - Production server

### Frontend (`/frontend`)  
- `npm run dev` - Vite development server with HMR
- `npm run build` - Production build with optimization
- `npm run preview` - Preview production build
- `npm run lint` - Code quality checking

## 💡 Usage Examples

### Message Tagging
```javascript
// Basic tag
@taskRequest Complete user authentication module

// Tag with metadata
@statusUpdate[project:frontend,completion:75%] Frontend development progress

// Complex workflow tag
@bugReport[severity:critical,component:auth,assignee:developer] Login system failing
```

### File Sharing
- **Images**: Drag & drop with automatic Cloudinary optimization
- **Documents**: GridFS storage for files up to 100MB
- **Progress**: Real-time upload progress with cancellation

### Friend Management
1. Search users by username or display name
2. Send friend requests with instant notifications
3. Accept/reject requests with real-time updates
4. View online status of friends

## 🔒 Security Features

- **Authentication** - JWT tokens with secure HTTP-only cookies
- **Authorization** - Route-level access control and user verification
- **Password Security** - bcrypt hashing with configurable rounds
- **File Validation** - Comprehensive upload security checks
- **CORS Protection** - Configurable cross-origin policies
- **Input Sanitization** - XSS and injection prevention
- **Environment Security** - Sensitive data isolation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Features Showcase

This application demonstrates:
- **Advanced React Patterns** - Hooks, context, state management
- **Real-time Architecture** - WebSocket communication and event handling  
- **File Storage Systems** - Multiple storage strategies and optimization
- **Database Design** - Complex relationships and efficient queries
- **Security Implementation** - Authentication, authorization, and data protection
- **Performance Optimization** - Lazy loading, caching, and efficient rendering
- **User Experience** - Responsive design and intuitive interfaces
- **System Administration** - Automated tasks and maintenance

---

**🌟 Star this repository if you find it useful!**

Built with ❤️ using modern web technologies and best practices.
