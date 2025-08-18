# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a 2025 internship project with multiple applications:

1. **2025Intern/backend** - Simple Node.js/Express server with Groq API integration
2. **2025Intern/groq-chat-app** - Full-stack chat application with Expo React Native frontend and Express backend

## Common Development Commands

### Groq Chat App (Main Project)
Located in `2025Intern/groq-chat-app/`

**Frontend (Expo React Native):**
```bash
cd 2025Intern/groq-chat-app
npm install
npx expo start              # Start development server
npm run android            # Run on Android emulator
npm run ios                # Run on iOS simulator  
npm run web                # Run in web browser
npm run lint               # Run ESLint
npm run reset-project      # Reset to blank project
```

**Backend API Server:**
```bash
cd 2025Intern/groq-chat-app/backend
npm install
npm run dev                # Start backend server (port 3001)
npm start                  # Production start
```

### Simple Backend
Located in `2025Intern/backend/`
```bash
cd 2025Intern/backend
npm install
npm run dev                # Start with nodemon
npm start                  # Production start
npm run ping               # Test API endpoint
```

## Architecture

### Groq Chat App Structure

**Frontend (Expo React Native):**
- Uses Expo Router for file-based routing
- Main app entry: `app/_layout.tsx` 
- Tab navigation: `app/(tabs)/_layout.tsx`
- Key screens: `app/(tabs)/index.tsx`, `app/(tabs)/explore.tsx`
- Reusable components in `components/` directory
- Theme system with `hooks/useColorScheme.ts` and `constants/Colors.ts`
- TypeScript configuration with path aliases (`@/*` maps to root)

**Backend API:**
- Express.js server with CORS enabled
- Groq API integration for AI chat responses
- Main endpoint: `POST /api/chat` (expects `{ prompt: string }`)
- Environment variables: `GROQ_API_KEY`, `PORT`
- Response format: `{ ok: boolean, text?: string, error?: string }`

**Web Interface:**
- Standalone HTML/CSS/JS chat interface in `public/`
- Real-time streaming chat with typewriter effect
- Speech recognition support (Web Speech API)
- Local storage for chat history and room management
- Configuration via `public/config.js` for API base URL

### Key Integration Points

1. **API Client** (`backend/client.ts`): TypeScript client for backend communication
2. **Environment Configuration**: API base URL configurable via `EXPO_PUBLIC_API_BASE_URL`
3. **Cross-Platform**: Shares backend between React Native app and web interface

### Backend Servers Comparison

- **2025Intern/backend/server.js**: Streaming-enabled Groq API integration with Server-Sent Events
- **2025Intern/groq-chat-app/backend/server.js**: Simple request/response Groq API integration

## Environment Setup

Required environment variables:
```bash
GROQ_API_KEY=your_groq_api_key_here
PORT=3001  # Optional, defaults to 3001
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001  # For frontend
```

## Development Workflow

1. Start backend server first: `cd 2025Intern/groq-chat-app/backend && npm run dev`
2. Start frontend: `cd 2025Intern/groq-chat-app && npx expo start`
3. For web-only testing: Open `2025Intern/groq-chat-app/public/index.html` in browser

## Testing

Currently no automated test framework configured. Manual testing via:
- Expo development builds for mobile testing
- Web browser for web interface testing
- API endpoint testing via backend ping command

## 開発ルールと制約

### Git操作
- mainブランチへの直接pushは禁止
- 全ての変更はプルリクエスト経由で行う
- force pushは原則禁止（特にmainブランチ）
- コミット前に必ずlintとビルドが通ることを確認

### セキュリティ
- .envファイルにAPIキーや秘密情報を記録
- .envファイルは絶対にコミットしない（.gitignoreで除外済み）
- APIキーやトークンをコードに直接書き込まない
- GROQ_API_KEY等の機密情報は環境変数で管理

### コミット規約
- 日本語でのコミットメッセージを推奨
- 変更内容を明確に記述する
- 機能追加: "機能: ○○を追加"
- バグ修正: "修正: ○○の問題を解決"
- リファクタリング: "リファクタ: ○○を改善"

### コード品質
- TypeScriptの型チェックエラーは修正必須
- ESLintのwarning/errorは修正してからコミット
- 未使用のimportやvariableは削除
- console.logのデバッグコードは本番前に削除