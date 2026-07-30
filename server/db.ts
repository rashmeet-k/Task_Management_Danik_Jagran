import mongoose from 'mongoose';
import * as fs from 'fs';
import { Project, Task, Activity, Notification, User, Milestone, Document, Annexure, FileRecord } from './models/index.ts';

const DB_FILE = './db.tson';

export function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
  "users": [
    {
      "id": "U01",
      "empId": "EMP-001",
      "name": "Rashmeet Kaur",
      "email": "rashmeet1309@gmail.com",
      "role": "Admin",
      "bureau": "Delhi Bureau",
      "active": true,
      "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      "passwordHash": "$2a$10$X8L"
    },
    {
      "id": "U02",
      "name": "Jasbeer Singh",
      "email": "jasbeer@example.com",
      "role": "Project Manager",
      "bureau": "Kanpur Bureau",
      "active": true,
      "avatar": "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150"
    }
  ],
  "projects": [
    {
      "id": "P01",
      "name": "AI Research Portal",
      "description": "Building a centralized portal for AI research datasets.",
      "progress": 68,
      "startDate": new Date(Date.now() - 5 * 86400000).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      "endDate": new Date(Date.now() + 15 * 86400000).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      "manager": "Jasbeer Singh",
      "managerId": "U02",
      "status": "In Progress",
      "priority": "High",
      "members": ["U01", "U02"],
      "timeline": []
    }
  ],
  "tasks": [
    {
      "id": "TS01",
      "projectId": "P01",
      "name": "Complete Research",
      "description": "Complete literature review.",
      "assignee": "Rashmeet Kaur",
      "assigneeId": "U01",
      "priority": "High",
      "dueDate": new Date(Date.now() + 15 * 86400000).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      "status": "In Progress",
      "progress": 68,
      "comments": [],
      "attachments": []
    }
  ],
  "milestones": [ { "id": "M01", "projectId": "P01", "name": "Beta Release", "lead": "Jasbeer Singh", "date": new Date(Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }), "status": "In Progress" }, { "id": "M02", "projectId": "P01", "name": "Phase 2 Planning", "lead": "Rashmeet Kaur", "date": new Date(Date.now() + 10 * 86400000).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }), "status": "Pending" } ],
  "recentActivity": [],
  "notifications": [],
  "documents": [],
  "annexures": []
}
;
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

const DEFAULT_USERS = [
  {
    id: "U01",
    name: "Rashmeet Kaur",
    email: "rashmeet1309@gmail.com",
    role: "Admin",
    bureau: "Kanpur Bureau / Print",
    active: true,
    department: "Editorial",
    phone: "+91 98765 43210",
    taskCount: "5/5",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
  },
  {
    id: "U02",
    name: "Jasbeer Singh",
    email: "jasbeer@example.com",
    role: "Project Manager",
    bureau: "Kanpur Bureau / Print",
    active: true,
    department: "Reporting",
    phone: "+91 98123 45678",
    taskCount: "3/4",
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150"
  },
  {
    id: "U03",
    name: "Amit Sharma",
    email: "amit@example.com",
    role: "Team Member",
    bureau: "Delhi Bureau / Digital",
    active: true,
    department: "Design",
    phone: "+91 98234 56789",
    taskCount: "2/3",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
  },
  {
    id: "U04",
    name: "Priya Patel",
    email: "priya@example.com",
    role: "Team Member",
    bureau: "Mumbai Bureau / Print",
    active: true,
    department: "Editing",
    phone: "+91 98345 67890",
    taskCount: "4/4",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"
  }
];

export function getDbData() {
  initDb();
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const data = JSON.parse(raw);
  if (!data.users || data.users.length === 0) {
    data.users = DEFAULT_USERS;
    writeDbData(data);
  }
  return data;
}

export function writeDbData(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}


function mapId(arr: any[]) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    const mapped = {
      ...item,
      id: item.id || (item._id ? item._id.toString() : '')
    };
    if (mapped.comments && Array.isArray(mapped.comments)) {
      mapped.comments = mapped.comments.map((c: any) => ({
        ...c,
        id: c.id || (c._id ? c._id.toString() : '')
      }));
    }
    if (mapped.attachments && Array.isArray(mapped.attachments)) {
      mapped.attachments = mapped.attachments.map((a: any) => ({
        ...a,
        id: a.id || (a._id ? a._id.toString() : '')
      }));
    }
    if (mapped.timeline && Array.isArray(mapped.timeline)) {
      mapped.timeline = mapped.timeline.map((t: any) => ({
        ...t,
        id: t.id || (t._id ? t._id.toString() : '')
      }));
    }
    return mapped;
  });
}

function deduplicateUsers(users: any[]) {
  if (!Array.isArray(users)) return [];
  const seen = new Map<string, any>();
  for (const user of users) {
    const key = (user.email || user.id || '').toLowerCase();
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, user);
    } else {
      const existing = seen.get(key);
      // If the current object has a real firebase UID (length > 10), prefer it
      if (user.id && user.id.length > 10) {
        seen.set(key, { ...existing, ...user });
      } else {
        seen.set(key, { ...user, ...existing });
      }
    }
  }
  return Array.from(seen.values());
}

export async function getDbDataAsync() {
  if (mongoose.connection.readyState !== 1) {
    return getDbData();
  }
  try {
    const rawUsers = await User.find({}).lean();
    const rawProjects = await Project.find({}).lean();
    const rawTasks = await Task.find({}).lean();
    const rawMilestones = await Milestone.find({}).lean();
    const rawActivity = await Activity.find({}).lean();
    const rawNotifications = await Notification.find({}).lean();
    const rawDocuments = await Document.find({}).lean();
    const rawAnnexures = await Annexure.find({}).lean();
    const rawFiles = await FileRecord.find({}).lean();

    const mappedUsers = deduplicateUsers(mapId(rawUsers));

    return {
      users: mappedUsers,
      projects: mapId(rawProjects),
      tasks: mapId(rawTasks),
      milestones: mapId(rawMilestones),
      recentActivity: mapId(rawActivity),
      notifications: mapId(rawNotifications),
      documents: mapId(rawDocuments),
      annexures: mapId(rawAnnexures),
      files: mapId(rawFiles)
    };
  } catch (e) {
    console.error("Error fetching from MongoDB, falling back to JSON", e);
    return getDbData();
  }
}

async function syncModelWithData(Model: any, items: any[], isUserModel = false) {
  if (!items || !Array.isArray(items)) return;

  // 1. Upsert all current items
  const bulkOps = items.map(item => {
    const filters: any[] = [];
    if (item.id) filters.push({ id: item.id });
    if (item._id && mongoose.Types.ObjectId.isValid(String(item._id))) {
      filters.push({ _id: item._id });
    } else if (item.id && mongoose.Types.ObjectId.isValid(String(item.id))) {
      filters.push({ _id: item.id });
    }
    if (isUserModel && item.email) {
      filters.push({ email: item.email.toLowerCase() });
    }
    
    let filterQuery = {};
    if (filters.length === 1) {
      filterQuery = filters[0];
    } else if (filters.length > 1) {
      filterQuery = { $or: filters };
    } else {
       filterQuery = { id: item.id || '' };
    }
    
    const updateData = { ...item };
    delete updateData._id;
    
    return {
      updateOne: {
        filter: filterQuery,
        update: { $set: updateData },
        upsert: true
      }
    };
  });

  if (bulkOps.length > 0) {
    try {
      await Model.bulkWrite(bulkOps, { ordered: false });
    } catch (err) {
      console.error('BulkWrite error', err);
    }
  }

  // 2. Gather all valid identifiers that MUST be kept
  const validIds = new Set<string>();
  const validEmails = new Set<string>();

  for (const item of items) {
    if (item.id) validIds.add(String(item.id));
    if (item._id) {
      validIds.add(String(item._id));
    }
    if (isUserModel && item.email) {
      validEmails.add(item.email.toLowerCase());
    }
  }

  // 3. Delete any documents in Mongo that do NOT match any of the valid identifiers
  try {
    const allDocs = await Model.find({}).lean();
    const idsToDelete: any[] = [];

    for (const doc of allDocs) {
      const docId = doc.id ? String(doc.id) : '';
      const docMongoId = doc._id ? String(doc._id) : '';
      const docEmail = isUserModel && doc.email ? String(doc.email).toLowerCase() : '';

      const isKeep = 
        (docId && validIds.has(docId)) ||
        (docMongoId && validIds.has(docMongoId)) ||
        (docEmail && validEmails.has(docEmail));

      if (!isKeep) {
        idsToDelete.push(doc._id);
      }
    }

    if (idsToDelete.length > 0) {
      await Model.deleteMany({ _id: { $in: idsToDelete } });
    }
  } catch (err) {
    console.error(`Error purging deleted documents for model ${Model.modelName}:`, err);
  }
}

export async function writeDbDataAsync(data: any) {
  // Always update local JSON file synchronously
  writeDbData(data);

  if (mongoose.connection.readyState !== 1) {
    return;
  }

  try {
    if (data.users) {
      const deduped = deduplicateUsers(data.users);
      await syncModelWithData(User, deduped, true);
    }
    if (data.projects) {
      await syncModelWithData(Project, data.projects);
    }
    if (data.tasks) {
      await syncModelWithData(Task, data.tasks);
    }
    if (data.milestones) {
      await syncModelWithData(Milestone, data.milestones);
    }
    if (data.recentActivity) {
      await syncModelWithData(Activity, data.recentActivity);
    }
    if (data.notifications) {
      await syncModelWithData(Notification, data.notifications);
    }
    if (data.documents) {
      await syncModelWithData(Document, data.documents);
    }
    if (data.annexures) {
      await syncModelWithData(Annexure, data.annexures);
    }
    if (data.files) {
      await syncModelWithData(FileRecord, data.files);
    }
  } catch (e) {
    console.error("Error writing to MongoDB in writeDbDataAsync", e);
  }
}

// Migration helper: If Mongo is completely empty, seed initial baseline
export async function seedMongoFromJSON() {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const userCount = await User.countDocuments();
    const projectCount = await Project.countDocuments();
    if (userCount === 0 && projectCount === 0) {
      console.log("MongoDB is completely empty. Seeding initial database...");
      const localDb = getDbData();
      await writeDbDataAsync(localDb);
      console.log("Seeding complete.");
    }
  } catch(e) {
    console.error("Error during seeding", e);
  }
}
