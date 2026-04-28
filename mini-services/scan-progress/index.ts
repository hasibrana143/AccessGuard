import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 3003;

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server with permissive CORS for sandbox environment
const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow all origins in sandbox environment
    methods: ['GET', 'POST'],
    credentials: true
  },
  allowEIO3: true // Support older clients
});

// Store active scan progress
const activeScans = new Map<string, ScanProgress>();

interface ScanProgress {
  scanId: string;
  projectId: string;
  projectName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentPage: string;
  pagesScanned: number;
  totalPages: number;
  violationsFound: number;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current active scans to new client
  socket.emit('active-scans', Array.from(activeScans.values()));

  // Join project room for updates
  socket.on('join-project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    console.log(`Client ${socket.id} joined project ${projectId}`);
    
    // Send project's active scan if any
    const projectScan = Array.from(activeScans.values()).find(s => s.projectId === projectId);
    if (projectScan) {
      socket.emit('scan-progress', projectScan);
    }
  });

  // Leave project room
  socket.on('leave-project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
    console.log(`Client ${socket.id} left project ${projectId}`);
  });

  // Start a new scan (called by scan API)
  socket.on('start-scan', (data: { scanId: string; projectId: string; projectName: string; totalPages: number }) => {
    const progress: ScanProgress = {
      scanId: data.scanId,
      projectId: data.projectId,
      projectName: data.projectName,
      status: 'running',
      progress: 0,
      currentPage: '',
      pagesScanned: 0,
      totalPages: data.totalPages,
      violationsFound: 0,
      startTime: new Date(),
      errors: []
    };

    activeScans.set(data.scanId, progress);
    
    // Broadcast to all clients
    io.emit('scan-started', progress);
    io.to(`project:${data.projectId}`).emit('scan-progress', progress);
    
    console.log(`Scan started: ${data.scanId} for project ${data.projectName}`);
  });

  // Update scan progress
  socket.on('update-progress', (data: { 
    scanId: string; 
    currentPage?: string; 
    pagesScanned?: number;
    violationsFound?: number;
    progress?: number;
  }) => {
    const scan = activeScans.get(data.scanId);
    if (!scan) return;

    if (data.currentPage) scan.currentPage = data.currentPage;
    if (data.pagesScanned !== undefined) scan.pagesScanned = data.pagesScanned;
    if (data.violationsFound !== undefined) scan.violationsFound = data.violationsFound;
    if (data.progress !== undefined) scan.progress = data.progress;

    // Broadcast update
    io.to(`project:${scan.projectId}`).emit('scan-progress', scan);
    io.emit('scan-updated', scan);
  });

  // Complete scan
  socket.on('complete-scan', (data: { scanId: string; violationsFound: number }) => {
    const scan = activeScans.get(data.scanId);
    if (!scan) return;

    scan.status = 'completed';
    scan.progress = 100;
    scan.violationsFound = data.violationsFound;
    scan.endTime = new Date();

    // Broadcast completion
    io.to(`project:${scan.projectId}`).emit('scan-completed', scan);
    io.emit('scan-completed', scan);

    // Remove from active scans after a delay
    setTimeout(() => {
      activeScans.delete(data.scanId);
    }, 60000); // Keep for 1 minute after completion

    console.log(`Scan completed: ${data.scanId}`);
  });

  // Fail scan
  socket.on('fail-scan', (data: { scanId: string; error: string }) => {
    const scan = activeScans.get(data.scanId);
    if (!scan) return;

    scan.status = 'failed';
    scan.errors.push(data.error);
    scan.endTime = new Date();

    // Broadcast failure
    io.to(`project:${scan.projectId}`).emit('scan-failed', scan);
    io.emit('scan-failed', scan);

    // Remove from active scans after a delay
    setTimeout(() => {
      activeScans.delete(data.scanId);
    }, 60000);

    console.log(`Scan failed: ${data.scanId} - ${data.error}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Scan Progress WebSocket service running on port ${PORT}`);
});

export { io, activeScans };
export type { ScanProgress };
