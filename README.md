# EstoSpaces Web Client

This is the frontend application for EstoSpaces, built with React and Vite.

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) with your browser to see the application.

## 🔄 Switching Backend Environments

By default, the local frontend will try to connect to **local backend services** on ports `:8080`, `:8081`, etc.

If you don't want to run all the microservices locally, you can switch the backend target to the live **GCP Dev** environment with a single command!

### Connect to GCP Dev (Live Cloud Run)

To point your local frontend to the live development backend:

```bash
npm run env:dev
```
*Then restart the server with `npm run dev`.*

### Connect to Localhost (Local Docker/Go)

To point your local frontend back to your local backend services:

```bash
npm run env:local
```
*Then restart the server with `npm run dev`.*

> **How it works:** These commands copy the `.env.gcp-dev` or `.env.local-preset` file into `.env.development`, which Vite reads automatically when you run the development server.
