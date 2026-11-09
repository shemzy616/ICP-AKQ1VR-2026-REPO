import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  masterResume?: {
    rawText: string;
    parsedSkills: string[];
    updatedAt: string;
  };
}

export interface StoredSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface StoredColumn {
  _id: string;
  name: string;
  order: number;
  boardId: string;
  JobApplications: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoredJobApplication {
  _id: string;
  company: string;
  position: string;
  status: string;
  notes?: string;
  location?: string;
  description?: string;
  salaryText?: string;
  responsibilities?: string[];
  requirements?: string[];
  recruiterContact?: string;
  columnId: string;
  boardId: string;
  jobUrl?: string;
  appliedDate?: string;
  tags?: string[];
  salary?: number;
  order: number;
  fitAnalysis?: any;
  lastFollowedUpAt?: string;
  isArchived?: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredBoard {
  _id: string;
  name: string;
  userId: string;
  columns: string[];
  createdAt: string;
  updatedAt: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  sessions: StoredSession[];
  boards: StoredBoard[];
  columns: StoredColumn[];
  jobApplications: StoredJobApplication[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const DEFAULT_COLUMNS = [
  { name: "Wishlist", order: 0 },
  { name: "Applied", order: 1 },
  { name: "Interviewing", order: 2 },
  { name: "Offered", order: 3 },
  { name: "Rejected", order: 4 },
];

// In-memory cache
let cachedDb: DatabaseSchema | null = null;

function ensureDbFile(): DatabaseSchema {
  if (cachedDb) return cachedDb;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      users: [],
      sessions: [],
      boards: [],
      columns: [],
      jobApplications: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    cachedDb = initialData;
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    cachedDb = JSON.parse(raw);
    return cachedDb!;
  } catch (err) {
    console.error("Failed to read db.json, creating new:", err);
    const initialData: DatabaseSchema = {
      users: [],
      sessions: [],
      boards: [],
      columns: [],
      jobApplications: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    cachedDb = initialData;
    return initialData;
  }
}

function persistDb(): void {
  if (!cachedDb) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = DB_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(cachedDb, null, 2), "utf-8");
  fs.renameSync(tmpFile, DB_FILE);
}

// Password hashing
function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export const storage = {
  // --- USERS & AUTH ---
  getUserByEmail(email: string): StoredUser | null {
    const db = ensureDbFile();
    const normalized = email.toLowerCase().trim();
    return db.users.find((u) => u.email.toLowerCase() === normalized) || null;
  },

  getUserById(id: string): StoredUser | null {
    const db = ensureDbFile();
    return db.users.find((u) => u.id === id) || null;
  },

  createUser(email: string, password: string, name: string): StoredUser {
    const db = ensureDbFile();
    const normalized = email.toLowerCase().trim();

    if (db.users.some((u) => u.email.toLowerCase() === normalized)) {
      throw new Error("A user with this email already exists");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const id = "usr_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);

    const user: StoredUser = {
      id,
      email: normalized,
      name: name.trim() || normalized.split("@")[0],
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    db.users.push(user);
    persistDb();

    // Automatically initialize a board with default columns for this user
    this.initializeUserBoard(user.id);

    return user;
  },

  verifyPassword(user: StoredUser, password: string): boolean {
    const testHash = hashPassword(password, user.salt);
    return crypto.timingSafeEqual(
      Buffer.from(testHash, "utf-8"),
      Buffer.from(user.passwordHash, "utf-8")
    );
  },

  // --- SESSIONS ---
  createSession(userId: string): StoredSession {
    const db = ensureDbFile();
    const token = crypto.randomBytes(32).toString("hex");
    const id = "ses_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    // 30 days expiration
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const session: StoredSession = {
      id,
      userId,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    db.sessions.push(session);
    persistDb();
    return session;
  },

  getSessionByToken(token: string): { session: StoredSession; user: StoredUser } | null {
    if (!token) return null;
    const db = ensureDbFile();
    const session = db.sessions.find((s) => s.token === token);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      // Expired, clean it up
      this.deleteSession(token);
      return null;
    }

    const user = db.users.find((u) => u.id === session.userId);
    if (!user) return null;

    return { session, user };
  },

  deleteSession(token: string): void {
    const db = ensureDbFile();
    db.sessions = db.sessions.filter((s) => s.token !== token);
    persistDb();
  },

  // --- BOARDS & COLUMNS ---
  initializeUserBoard(userId: string): StoredBoard {
    const db = ensureDbFile();
    const existing = db.boards.find((b) => b.userId === userId);
    if (existing) return existing;

    const boardId = "brd_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const now = new Date().toISOString();

    const createdColumns = DEFAULT_COLUMNS.map((col) => {
      const colId = "col_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const column: StoredColumn = {
        _id: colId,
        name: col.name,
        order: col.order,
        boardId,
        JobApplications: [],
        createdAt: now,
        updatedAt: now,
      };
      db.columns.push(column);
      return column;
    });

    const board: StoredBoard = {
      _id: boardId,
      name: "My Job Applications",
      userId,
      columns: createdColumns.map((c) => c._id),
      createdAt: now,
      updatedAt: now,
    };

    db.boards.push(board);
    persistDb();
    return board;
  },

  getBoardWithColumnsAndApps(userId: string) {
    const db = ensureDbFile();
    let board = db.boards.find((b) => b.userId === userId);
    if (!board) {
      board = this.initializeUserBoard(userId);
    }

    const columns = db.columns
      .filter((c) => c.boardId === board!._id)
      .sort((a, b) => a.order - b.order);

    const userApps = db.jobApplications.filter((a) => a.boardId === board!._id);

    const columnsWithApps = columns.map((col) => {
      const apps = userApps
        .filter((app) => app.columnId === col._id)
        .sort((a, b) => a.order - b.order);

      return {
        ...col,
        JobApplications: apps,
      };
    });

    return {
      board: {
        _id: board._id,
        name: board.name,
        userId: board.userId,
      },
      columns: columnsWithApps,
    };
  },

  // --- JOB APPLICATIONS ---
  createJobApplication(
    userId: string,
    data: {
      company: string;
      position: string;
      columnId?: string;
      boardId?: string;
      status?: string;
      location?: string;
      salary?: number;
      salaryText?: string;
      responsibilities?: string[];
      requirements?: string[];
      recruiterContact?: string;
      jobUrl?: string;
      appliedDate?: string | Date;
      tags?: string[];
      notes?: string;
      description?: string;
    }
  ): StoredJobApplication {
    const db = ensureDbFile();
    let board = db.boards.find((b) => b.userId === userId);
    if (!board) {
      board = this.initializeUserBoard(userId);
    }

    // Determine target column
    let column = db.columns.find((c) => c._id === data.columnId && c.boardId === board!._id);
    if (!column) {
      column = db.columns
        .filter((c) => c.boardId === board!._id)
        .sort((a, b) => a.order - b.order)[0];
    }

    if (!column) {
      throw new Error("No columns available on board");
    }

    const countInCol = db.jobApplications.filter(
      (a) => a.columnId === column!._id && a.boardId === board!._id
    ).length;

    const appId = "app_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const now = new Date().toISOString();

    const newApp: StoredJobApplication = {
      _id: appId,
      company: data.company.trim(),
      position: data.position.trim(),
      status: data.status || column.name,
      notes: data.notes || "",
      location: data.location || "",
      description: data.description || "",
      salaryText: data.salaryText || "",
      responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities : [],
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      recruiterContact: data.recruiterContact || "",
      salary: data.salary ? Number(data.salary) : undefined,
      jobUrl: data.jobUrl || "",
      appliedDate: data.appliedDate
        ? new Date(data.appliedDate).toISOString()
        : now,
      tags: Array.isArray(data.tags) ? data.tags : [],
      order: countInCol,
      fitAnalysis: data.fitAnalysis || undefined,
      lastFollowedUpAt: data.lastFollowedUpAt || undefined,
      isArchived: data.isArchived || false,
      columnId: column._id,
      boardId: board._id,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    db.jobApplications.push(newApp);
    if (!column.JobApplications.includes(appId)) {
      column.JobApplications.push(appId);
    }

    persistDb();
    return newApp;
  },

  updateJobApplication(
    id: string,
    userId: string,
    updates: Partial<StoredJobApplication>
  ): StoredJobApplication | null {
    const db = ensureDbFile();
    const app = db.jobApplications.find((a) => a._id === id && a.userId === userId);
    if (!app) return null;

    // Handle moving across columns
    if (updates.columnId && updates.columnId !== app.columnId) {
      const oldCol = db.columns.find((c) => c._id === app.columnId);
      const newCol = db.columns.find((c) => c._id === updates.columnId);

      if (newCol) {
        if (oldCol) {
          oldCol.JobApplications = oldCol.JobApplications.filter((appId) => appId !== id);
        }
        if (!newCol.JobApplications.includes(id)) {
          newCol.JobApplications.push(id);
        }
        app.columnId = newCol._id;
        if (!updates.status) {
          app.status = newCol.name;
        }
      }
    }

    if (updates.company !== undefined) app.company = updates.company;
    if (updates.position !== undefined) app.position = updates.position;
    if (updates.status !== undefined) app.status = updates.status;
    if (updates.notes !== undefined) app.notes = updates.notes;
    if (updates.location !== undefined) app.location = updates.location;
    if (updates.description !== undefined) app.description = updates.description;
    if (updates.salaryText !== undefined) app.salaryText = updates.salaryText;
    if (updates.responsibilities !== undefined) app.responsibilities = updates.responsibilities;
    if (updates.requirements !== undefined) app.requirements = updates.requirements;
    if (updates.recruiterContact !== undefined) app.recruiterContact = updates.recruiterContact;
    if (updates.salary !== undefined) app.salary = updates.salary;
    if (updates.jobUrl !== undefined) app.jobUrl = updates.jobUrl;
    if (updates.appliedDate !== undefined) {
      app.appliedDate = updates.appliedDate
        ? new Date(updates.appliedDate).toISOString()
        : undefined;
    }
    if (updates.tags !== undefined) app.tags = updates.tags;
    if (updates.order !== undefined) app.order = updates.order;
    if (updates.fitAnalysis !== undefined) app.fitAnalysis = updates.fitAnalysis;
    if (updates.lastFollowedUpAt !== undefined) app.lastFollowedUpAt = updates.lastFollowedUpAt;
    if (updates.isArchived !== undefined) app.isArchived = updates.isArchived;

    app.updatedAt = new Date().toISOString();
    persistDb();
    return app;
  },

  bulkUpdateApplications(
    userId: string,
    appIds: string[],
    updates: Partial<StoredJobApplication>
  ): { updatedCount: number; updatedApplications: StoredJobApplication[] } {
    const db = ensureDbFile();
    const updatedApplications: StoredJobApplication[] = [];
    const idSet = new Set(appIds);

    for (const app of db.jobApplications) {
      if (app.userId === userId && idSet.has(app._id)) {
        // If moving to another column (e.g., Rejected)
        if (updates.columnId && updates.columnId !== app.columnId) {
          const oldCol = db.columns.find((c) => c._id === app.columnId);
          const newCol = db.columns.find((c) => c._id === updates.columnId);

          if (newCol) {
            if (oldCol) {
              oldCol.JobApplications = oldCol.JobApplications.filter((id) => id !== app._id);
            }
            if (!newCol.JobApplications.includes(app._id)) {
              newCol.JobApplications.push(app._id);
            }
            app.columnId = newCol._id;
            app.status = updates.status || newCol.name;
          }
        }

        if (updates.status !== undefined) app.status = updates.status;
        if (updates.isArchived !== undefined) app.isArchived = updates.isArchived;
        if (updates.lastFollowedUpAt !== undefined) app.lastFollowedUpAt = updates.lastFollowedUpAt;
        if (updates.notes !== undefined) app.notes = updates.notes;

        app.updatedAt = new Date().toISOString();
        updatedApplications.push(app);
      }
    }

    if (updatedApplications.length > 0) {
      persistDb();
    }

    return { updatedCount: updatedApplications.length, updatedApplications };
  },

  getJobApplicationById(id: string, userId: string): StoredJobApplication | null {
    const db = ensureDbFile();
    return db.jobApplications.find((a) => a._id === id && a.userId === userId) || null;
  },

  getAllApplicationsForUser(userId: string): StoredJobApplication[] {
    const db = ensureDbFile();
    return db.jobApplications.filter((a) => a.userId === userId);
  },

  getUserMasterResume(userId: string): StoredUser["masterResume"] | null {
    const db = ensureDbFile();
    const user = db.users.find((u) => u.id === userId);
    return user?.masterResume || null;
  },

  updateUserMasterResume(
    userId: string,
    rawText: string,
    parsedSkills: string[]
  ): { rawText: string; parsedSkills: string[]; updatedAt: string } | null {
    const db = ensureDbFile();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return null;

    const resumeData = {
      rawText,
      parsedSkills,
      updatedAt: new Date().toISOString(),
    };
    user.masterResume = resumeData;
    persistDb();
    return resumeData;
  },

  deleteJobApplication(id: string, userId: string): boolean {
    const db = ensureDbFile();
    const appIndex = db.jobApplications.findIndex((a) => a._id === id && a.userId === userId);
    if (appIndex === -1) return false;

    const app = db.jobApplications[appIndex];
    const col = db.columns.find((c) => c._id === app.columnId);
    if (col) {
      col.JobApplications = col.JobApplications.filter((appId) => appId !== id);
    }

    db.jobApplications.splice(appIndex, 1);
    persistDb();
    return true;
  },
};
