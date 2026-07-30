import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import * as admin from 'firebase-admin';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getDbData, writeDbData, initDb, getDbDataAsync, writeDbDataAsync } from './server/db.ts';
import mongoose from 'mongoose';
import { connectDB, Project, Task, Document, Annexure, Milestone, User } from './server/models/index.ts';
import { seedMongoFromJSON } from './server/db.ts';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Initialize the Database
initDb();
connectDB().then(() => seedMongoFromJSON());

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'task-management-a59ab'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.memoryStorage();
const upload = multer({ storage });

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
    bureau: string;
  };
}

const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Access Token Required' });
    return;
  }

  let decodedUid: string | undefined;
  let decodedEmail: string | undefined;
  let decodedName: string | undefined;
  let decodedPicture: string | undefined;

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    decodedUid = decodedToken.uid;
    decodedEmail = decodedToken.email;
    decodedName = decodedToken.name;
    decodedPicture = decodedToken.picture;
  } catch (firebaseErr) {
    // Return 403 cleanly without throwing a loud error to stderr
    res.status(403).json({ message: 'Invalid or Expired Token' });
    return;
  }

  try {
    const db = await getDbDataAsync();

    // Check if the user's specific UID is in the deletedUsers list
    const isDeleted = (db.deletedUsers || []).some((u: any) => 
      (decodedUid && u.id === decodedUid)
    );

    if (isDeleted) {
      res.status(403).json({ message: 'User has been deleted' });
      return;
    }

    let userInDb = db.users.find((u: any) => u.id === decodedUid || (decodedEmail && u.email && u.email.toLowerCase() === decodedEmail.toLowerCase()));
    
    const adminEmails = process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
      : ['rashmeet1309@gmail.com', 'admin@example.com', 'admin@newsroom.com'];

    const isAdminEmail = decodedEmail && adminEmails.includes(decodedEmail.toLowerCase());

    if (userInDb) {
      let needsSave = false;
      if (userInDb.id !== decodedUid && decodedUid) {
        userInDb.id = decodedUid;
        needsSave = true;
      }
      if (isAdminEmail && userInDb.role !== 'Admin') {
        userInDb.role = 'Admin';
        needsSave = true;
      }
      if (needsSave) {
        await writeDbDataAsync(db);
      }
      req.user = userInDb;
    } else {
      let role = isAdminEmail ? 'Admin' : 'Team Member';
      const displayName = decodedName || (decodedEmail ? decodedEmail.split('@')[0] : 'User');
      if (typeof db.empIdCounter !== 'number') {
        db.empIdCounter = db.users.reduce((max: number, u: any) => {
          const match = (u.empId || '').match(/^EMP-(\d+)$/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
      }
      db.empIdCounter += 1;
      const empId = 'EMP-' + db.empIdCounter.toString().padStart(4, '0');

      const newUser = {
        id: decodedUid || 'U' + Date.now(),
        empId: empId,
        name: displayName,
        email: decodedEmail || '',
        role: role,
        avatar: decodedPicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        bureau: 'Kanpur Bureau / Print',
        active: true,
        department: 'Editorial',
        phone: '',
        taskCount: '0/0'
      };
      db.users.push(newUser);
      await writeDbDataAsync(db);
      req.user = newUser;
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Log activity helper
async function logActivity(userId: string, userName: string, userAvatar: string, action: string, entityName: string, projectId?: string) {
  const db = await getDbDataAsync();
  const newActivity = {
    id: 'AC' + (Date.now() + Math.floor(Math.random() * 1000)),
    userId,
    userName,
    userAvatar,
    action,
    entityName,
    timestamp: new Date().toISOString()
  };
  db.recentActivity = [newActivity, ...db.recentActivity];
  await writeDbDataAsync(db);
}

// ----------------------------------------------------
// DASHBOARD STATS ENDPOINTS
// DASHBOARD STATS ENDPOINTS
// ----------------------------------------------------

app.get('/api/dashboard/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const role = req.user?.role;
  const userId = req.user?.id;

  const totalUsers = db.users.length;
  const activeUsers = db.users.filter((u: any) => u.active).length;
  const totalProjects = db.projects.length;
  const activeProjects = db.projects.filter((p: any) => p.status === 'In Progress' || p.status === 'Pending').length;
  const totalTasks = db.tasks.length;
  const completedTasks = db.tasks.filter((t: any) => t.status === 'Completed').length;
  const pendingTasks = db.tasks.filter((t: any) => t.status !== 'Completed').length;

  // Simple relative calculation of overdue tasks (e.g. status != Completed and deadline implies attention, let's hardcode or dynamic)
  const overdueTasks = db.tasks.filter((t: any) => t.status !== 'Completed' && t.priority === 'High' || t.priority === 'Critical').length;

  // Filter tasks or projects based on Role if needed
  let dashboardStats: any = {};

  if (role === 'Admin') {
    dashboardStats = {
      totalUsers,
      activeUsers,
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      employeesCount: db.users.filter((u: any) => u.role === 'Team Member').length,
      managersCount: db.users.filter((u: any) => u.role === 'Project Manager').length,
    };
  } else if (role === 'Project Manager') {
    const managedProjects = db.projects.filter((p: any) => p.managerId === userId);
    const managedProjectIds = managedProjects.map((p: any) => p.id);
    const pmTasks = db.tasks.filter((t: any) => managedProjectIds.includes(t.projectId));

    dashboardStats = {
      totalProjects: managedProjects.length,
      activeProjects: managedProjects.filter((p: any) => p.status === 'In Progress').length,
      totalTasks: pmTasks.length,
      completedTasks: pmTasks.filter((t: any) => t.status === 'Completed').length,
      pendingTasks: pmTasks.filter((t: any) => t.status !== 'Completed').length,
      overdueTasks: pmTasks.filter((t: any) => t.status !== 'Completed' && (t.priority === 'High' || t.priority === 'Critical')).length,
    };
  } else {
    // Team Member
    const myTasks = db.tasks.filter((t: any) => t.assigneeId === userId);
    dashboardStats = {
      totalTasks: myTasks.length,
      completedTasks: myTasks.filter((t: any) => t.status === 'Completed').length,
      pendingTasks: myTasks.filter((t: any) => t.status !== 'Completed').length,
      overdueTasks: myTasks.filter((t: any) => t.status !== 'Completed' && (t.priority === 'High' || t.priority === 'Critical')).length,
    };
  }

  res.json({
    stats: dashboardStats,
    projectStatusDistribution: {
      inProgress: db.projects.filter((p: any) => p.status === 'In Progress').length,
      pending: db.projects.filter((p: any) => p.status === 'Pending').length,
      review: db.projects.filter((p: any) => p.status === 'Review').length,
      completed: db.projects.filter((p: any) => p.status === 'Completed').length,
      onHold: db.projects.filter((p: any) => p.status === 'On Hold' || p.status === 'Planning').length,
    }
  });
});

// ----------------------------------------------------
// PROJECT MANAGEMENT ENDPOINTS
// ----------------------------------------------------

app.get('/api/projects/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { id } = req.params;
  const project = db.projects.find((p: any) => p.id === id || String(p._id) === id);
  if (!project) {
    res.status(404).json({ message: 'Project not found' });
    return;
  }
  res.json(project);
});

app.get('/api/projects', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const role = req.user?.role;
  const userId = req.user?.id;

  const computeProgressAndManager = (projs: any[]) => {
    return projs.map(p => {
      // 1. Progress
      const projectTasks = db.tasks.filter((t: any) => t.projectId === p.id || t.projectId === p._id || t.projectId === String(p._id));
      let progress = 0;
      if (projectTasks.length > 0) {
        const completedTasks = projectTasks.filter((t: any) => t.status === 'Completed');
        progress = Math.round((completedTasks.length / projectTasks.length) * 100);
      }
      
      // 2. Manager validation (dont insert false data)
      let managerName = 'No';
      if (p.managerId) {
        const actualManager = db.users.find((u: any) => u.id === p.managerId || u._id === p.managerId || String(u._id) === p.managerId);
        if (actualManager) {
          managerName = actualManager.name;
        }
      }
      
      return { ...p, progress, manager: managerName };
    });
  };

  if (role === 'Admin') {
    res.json(computeProgressAndManager(db.projects));
    return;
  }

  if (role === 'Project Manager') {
    const userProjects = db.projects.filter((p: any) =>
      p.managerId === userId ||
      (p.members || []).includes(userId)
    );
    res.json(computeProgressAndManager(userProjects));
    return;
  }

  // Team Member: only projects they belong to or are assigned tasks in
  const userProjects = db.projects.filter((p: any) =>
    (p.members || []).includes(userId) ||
    db.tasks.some((t: any) => (t.projectId === p.id || String(t.projectId) === String(p._id) || String(t.projectId) === String(p.id)) && t.assigneeId === userId)
  );
  res.json(computeProgressAndManager(userProjects));
});

app.post('/api/projects', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'Team Member') {
    res.status(403).json({ message: 'Forbidden: Team Members cannot create projects' });
    return;
  }

  const db = await getDbDataAsync();
  const { name, description, startDate, endDate, priority, status, managerId } = req.body;

  const manager = db.users.find((u: any) => u.id === managerId);
  if (typeof db.teamIdCounter !== 'number') {
    db.teamIdCounter = db.projects.reduce((max: number, p: any) => {
      const num = parseInt((p.teamId || '').replace('TM', ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
  }
  db.teamIdCounter += 1;
  const nextTeamId = 'TM' + db.teamIdCounter.toString().padStart(2, '0');

  if (typeof db.projectIdCounter !== 'number') {
    db.projectIdCounter = db.projects.reduce((max: number, p: any) => {
      const match = (p.id || '').match(/^PRJ-(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
  }
  db.projectIdCounter += 1;
  const nextProjectId = 'PRJ-' + db.projectIdCounter.toString().padStart(3, '0');

  const newProject = {
    id: nextProjectId,
    teamId: nextTeamId,
    name,
    description,
    progress: 0,
    startDate,
    endDate,
    manager: manager ? manager.name : 'No',
    managerId: managerId || '',
    status: status || 'Planning',
    priority: priority || 'Medium',
    members: [req.user?.id],
    timeline: []
  };

  db.projects.push(newProject);
  await writeDbDataAsync(db);

  if (req.user) {
    logActivity(req.user.id, req.user.name, req.user.avatar, 'created project', `'${name}'`, newProject.id);
  }

  res.status(201).json(newProject);
});

app.put('/api/projects/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { id } = req.params;
  const projectIndex = db.projects.findIndex((p: any) => p.id === id);

  if (projectIndex === -1) {
    res.status(404).json({ message: 'Project not found' });
    return;
  }

  // Check milestone timeline permission: ONLY Admins can modify timeline
  if (req.body.timeline !== undefined && req.user?.role !== 'Admin') {
    res.status(403).json({ message: 'Forbidden: Only Administrators can modify project milestone timelines.' });
    return;
  }

  if (req.body.managerId) {
    const manager = db.users.find((u: any) => u.id === req.body.managerId);
    if (manager) {
      req.body.manager = manager.name;
    } else {
      req.body.manager = 'No';
    }
  } else if (req.body.managerId === '') {
    req.body.manager = 'No';
  }

  const updatedProject = { ...db.projects[projectIndex], ...req.body };
  db.projects[projectIndex] = updatedProject;
  await writeDbDataAsync(db);

  if (req.user) {
    logActivity(req.user.id, req.user.name, req.user.avatar, 'updated project', `'${updatedProject.name}'`, id);
  }

  res.json(updatedProject);
});

app.delete('/api/projects/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ message: 'Forbidden: Only Administrators can delete projects' });
    return;
  }

  const db = await getDbDataAsync();
  const { id } = req.params;
  const project = db.projects.find((p: any) => p.id === id || p._id === id || String(p._id) === id);

  if (!project) {
    res.status(404).json({ message: 'Project not found' });
    return;
  }

  const pId = project.id || id;

  // Delete from Mongo if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const projConditions: any[] = [{ id: pId }, { id }];
      if (mongoose.Types.ObjectId.isValid(id)) projConditions.push({ _id: id });
      if (project._id && mongoose.Types.ObjectId.isValid(String(project._id))) projConditions.push({ _id: String(project._id) });

      await Project.deleteMany({ $or: projConditions });
      await Task.deleteMany({ $or: [{ projectId: pId }, { projectId: id }] });
      await Document.deleteMany({ $or: [{ projectId: pId }, { projectId: id }] });
      await Annexure.deleteMany({ $or: [{ projectId: pId }, { projectId: id }] });
      await Milestone.deleteMany({ $or: [{ projectId: pId }, { projectId: id }] });
    } catch (err) {
      console.error("Error deleting project from Mongo:", err);
    }
  }

  db.projects = db.projects.filter((p: any) => p.id !== pId && p.id !== id && String(p._id) !== id);
  db.tasks = db.tasks.filter((t: any) => t.projectId !== pId && t.projectId !== id); // clean tasks belonging to project
  if (db.documents) {
    db.documents = db.documents.filter((d: any) => d.projectId !== pId && d.projectId !== id);
  }
  if (db.annexures) {
    db.annexures = db.annexures.filter((an: any) => an.projectId !== pId && an.projectId !== id);
  }
  if (db.milestones) {
    db.milestones = db.milestones.filter((m: any) => m.projectId !== pId && m.projectId !== id);
  }
  await writeDbDataAsync(db);

  if (req.user) {
    logActivity(req.user.id, req.user.name, req.user.avatar, 'deleted project', `'${project.name}'`, id);
  }

  res.json({ message: 'Project deleted successfully' });
});

// ----------------------------------------------------
// TASK MANAGEMENT ENDPOINTS
// ----------------------------------------------------

app.get('/api/projects/:projectId/tasks', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const db = await getDbDataAsync();
  const role = req.user?.role;
  const userId = req.user?.id;

  let tasks = db.tasks.filter((t: any) => t.projectId === projectId);
  if (role === 'Team Member') {
    tasks = tasks.filter((t: any) => t.assigneeId === userId);
  }
  res.json(tasks);
});

app.get('/api/tasks', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { projectId } = req.query;
  const role = req.user?.role;
  const userId = req.user?.id;

  let tasks = db.tasks || [];
  if (projectId) {
    tasks = tasks.filter((t: any) => t.projectId === (projectId as string));
  }
  if (role === 'Team Member') {
    tasks = tasks.filter((t: any) => t.assigneeId === userId);
  }
  res.json(tasks);
});

app.get('/api/tasks/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const task = db.tasks.find((t: any) => t.id === req.params.id);
  if (!task) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }
  // Check authorization for team member
  if (req.user?.role === 'Team Member' && task.assigneeId !== req.user.id) {
    res.status(403).json({ message: 'Forbidden: You can only view tasks assigned to you.' });
    return;
  }
  res.json(task);
});

app.post('/api/tasks', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'Team Member') {
    res.status(403).json({ message: 'Forbidden: Team Members cannot create tasks. Contact a Project Manager or Admin.' });
    return;
  }

  const db = await getDbDataAsync();
  const { projectId, name, description, assigneeId, priority, dueDate, status, progress } = req.body;

  const assignee = db.users.find((u: any) => u.id === assigneeId);
  if (typeof db.taskIdCounter !== 'number') {
    db.taskIdCounter = db.tasks.reduce((max: number, t: any) => {
      const num = parseInt((t.id || '').replace('TS', ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
  }
  db.taskIdCounter += 1;
  const nextTaskId = 'TS' + db.taskIdCounter.toString().padStart(3, '0');

  const newTask = {
    id: nextTaskId,
    projectId,
    name,
    description,
    assignee: assignee ? assignee.name : 'Unassigned',
    assigneeId: assigneeId || '',
    priority: priority || 'Medium',
    dueDate,
    status: status || 'To Do',
    progress: progress || 0,
    comments: [],
    attachments: []
  };

  db.tasks.push(newTask);

  // Recalculate project overall progress based on finished tasks
  const projectTasks = db.tasks.filter((t: any) => t.projectId === projectId);
  const completedCount = projectTasks.filter((t: any) => t.status === 'Completed').length;
  const projIndex = db.projects.findIndex((p: any) => p.id === projectId);
  if (projIndex !== -1 && projectTasks.length > 0) {
    db.projects[projIndex].progress = Math.round((completedCount / projectTasks.length) * 100);
  }

  await writeDbDataAsync(db);

  if (req.user) {
    logActivity(req.user.id, req.user.name, req.user.avatar, 'assigned task', `'${name}' to ${assignee ? assignee.name : 'Unassigned'}`, projectId);
  }

  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { id } = req.params;
  const taskIndex = db.tasks.findIndex((t: any) => t.id === id);

  if (taskIndex === -1) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  const oldTask = db.tasks[taskIndex];

  if (req.user?.role === 'Team Member') {
    if (oldTask.assigneeId !== req.user.id) {
      res.status(403).json({ message: 'Forbidden: You can only update tasks assigned to you.' });
      return;
    }
    // Team Members can only update status and progress
    const { status, progress } = req.body;
    const updatedTask = {
      ...oldTask,
      ...(status !== undefined ? { status } : {}),
      ...(progress !== undefined ? { progress } : {})
    };
    db.tasks[taskIndex] = updatedTask;

    const projectId = updatedTask.projectId;
    const projectTasks = db.tasks.filter((t: any) => t.projectId === projectId);
    const completedCount = projectTasks.filter((t: any) => t.status === 'Completed').length;
    const projIndex = db.projects.findIndex((p: any) => p.id === projectId);
    if (projIndex !== -1 && projectTasks.length > 0) {
      db.projects[projIndex].progress = Math.round((completedCount / projectTasks.length) * 100);
    }

    await writeDbDataAsync(db);

    if (req.user) {
      logActivity(req.user.id, req.user.name, req.user.avatar, 'changed status of', `'${updatedTask.name}' to "${updatedTask.status}"`, updatedTask.projectId);
    }

    res.json(updatedTask);
    return;
  }

  const { assigneeId } = req.body;
  let assigneeName = oldTask.assignee;
  if (assigneeId !== undefined) {
    const assignee = db.users.find((u: any) => u.id === assigneeId);
    assigneeName = assignee ? assignee.name : 'Unassigned';
  }

  const updatedTask = {
    ...oldTask,
    ...req.body,
    assignee: assigneeName
  };

  db.tasks[taskIndex] = updatedTask;

  // Recalculate project overall progress
  const projectId = updatedTask.projectId;
  const projectTasks = db.tasks.filter((t: any) => t.projectId === projectId);
  const completedCount = projectTasks.filter((t: any) => t.status === 'Completed').length;
  const projIndex = db.projects.findIndex((p: any) => p.id === projectId);
  if (projIndex !== -1 && projectTasks.length > 0) {
    db.projects[projIndex].progress = Math.round((completedCount / projectTasks.length) * 100);
  }

  await writeDbDataAsync(db);

  if (req.user) {
    logActivity(req.user.id, req.user.name, req.user.avatar, 'updated task', `'${updatedTask.name}'`, updatedTask.projectId);
  }

  res.json(updatedTask);
});

app.delete('/api/tasks/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'Team Member') {
    res.status(403).json({ message: 'Forbidden: Team Members cannot delete tasks.' });
    return;
  }
  const db = await getDbDataAsync();
  const { id } = req.params;
  const task = db.tasks.find((t: any) => t.id === id || t._id === id || (t._id && String(t._id) === id));

  if (!task) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  const tId = task.id || id;

  // Delete from Mongo if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const taskConditions: any[] = [{ id: tId }, { id }];
      if (mongoose.Types.ObjectId.isValid(id)) taskConditions.push({ _id: id });
      if (task._id && mongoose.Types.ObjectId.isValid(String(task._id))) taskConditions.push({ _id: String(task._id) });

      await Task.deleteMany({ $or: taskConditions });
    } catch (err) {
      console.error("Error deleting task from Mongo:", err);
    }
  }

  const projectId = task.projectId;
  db.tasks = db.tasks.filter((t: any) => t.id !== tId && t.id !== id && String(t._id) !== id);

  // Recalculate project progress if project found
  if (projectId) {
    const projectTasks = db.tasks.filter((t: any) => t.projectId === projectId);
    const projIndex = db.projects.findIndex((p: any) => p.id === projectId);
    if (projIndex !== -1) {
      if (projectTasks.length > 0) {
        const completedCount = projectTasks.filter((t: any) => t.status === 'Completed').length;
        db.projects[projIndex].progress = Math.round((completedCount / projectTasks.length) * 100);
      } else {
        db.projects[projIndex].progress = 0;
      }
    }
  }

  await writeDbDataAsync(db);

  if (req.user && task) {
    logActivity(req.user.id, req.user.name, req.user.avatar, 'deleted task', `'${task.name}'`, task.projectId);
  }

  res.json({ message: 'Task deleted successfully' });
});

// ----------------------------------------------------
// COMMENTS ENDPOINTS
// ----------------------------------------------------

app.post('/api/tasks/:id/comments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { id } = req.params;
  const { content } = req.body;

  const taskIndex = db.tasks.findIndex((t: any) => t.id === id);
  if (taskIndex === -1) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const newComment = {
    id: 'C' + Date.now(),
    userId: req.user.id,
    userName: req.user.name,
    userAvatar: req.user.avatar,
    content,
    timestamp: new Date().toISOString()
  };

  db.tasks[taskIndex].comments.push(newComment);
  await writeDbDataAsync(db);

  logActivity(req.user.id, req.user.name, req.user.avatar, 'commented on', `'${db.tasks[taskIndex].name}'`, db.tasks[taskIndex].projectId);

  res.status(201).json(newComment);
});


app.put('/api/tasks/:id/comments/:commentId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { id, commentId } = req.params;
  const { content } = req.body;

  const taskIndex = db.tasks.findIndex((t: any) => t.id === id);
  if (taskIndex === -1) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  const commentIndex = db.tasks[taskIndex].comments.findIndex((c: any) => c.id === commentId || (c._id && c._id.toString() === commentId));
  if (commentIndex !== -1) {
    db.tasks[taskIndex].comments[commentIndex].content = content;
    await writeDbDataAsync(db);
    res.json(db.tasks[taskIndex].comments[commentIndex]);
  } else {
    res.status(404).json({ message: 'Comment not found' });
  }
});

app.delete('/api/tasks/:id/comments/:commentId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { id, commentId } = req.params;

  const taskIndex = db.tasks.findIndex((t: any) => t.id === id);
  if (taskIndex === -1) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  db.tasks[taskIndex].comments = db.tasks[taskIndex].comments.filter((c: any) => c.id !== commentId && (!c._id || c._id.toString() !== commentId));
  await writeDbDataAsync(db);

  res.json({ message: 'Comment deleted successfully' });
});

// ----------------------------------------------------
// ATTACHMENTS ENDPOINTS
// ----------------------------------------------------

app.post('/api/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }
  res.status(201).json({ fileUrl: `/uploads/${req.file.filename}` });
});

app.post('/api/tasks/:id/attachments', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { id } = req.params;

  const taskIndex = db.tasks.findIndex((t: any) => t.id === id);
  if (taskIndex === -1) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const fileId = 'F' + Date.now() + Math.round(Math.random() * 1000);
  const newFile = {
    id: fileId,
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    data: req.file.buffer.toString('base64')
  };
  db.files = db.files || [];
  db.files.push(newFile);

  const newAttachment = {
    id: 'A' + Date.now(),
    name: req.file.originalname,
    fileUrl: `/api/downloads/${fileId}`,
    uploadedBy: req.user.role,
    uploadedAt: new Date().toISOString()
  };

  db.tasks[taskIndex].attachments.push(newAttachment);
  await writeDbDataAsync(db);

  logActivity(req.user.id, req.user.name, req.user.avatar, 'uploaded', `attachment '${req.file.originalname}' to task '${db.tasks[taskIndex].name}'`, db.tasks[taskIndex].projectId);

  res.status(201).json(newAttachment);
});

app.delete('/api/tasks/:id/attachments/:attachmentId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'Team Member') {
    res.status(403).json({ message: 'Forbidden: Only Managers and Admins can delete attachments.' });
    return;
  }

  const db = await getDbDataAsync();
  const { id, attachmentId } = req.params;

  const taskIndex = db.tasks.findIndex((t: any) => t.id === id);
  if (taskIndex === -1) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  db.tasks[taskIndex].attachments = db.tasks[taskIndex].attachments.filter((a: any) => a.id !== attachmentId && (!a._id || a._id.toString() !== attachmentId));
  await writeDbDataAsync(db);

  res.json({ message: 'Attachment deleted successfully' });
});

// ----------------------------------------------------
// ANNEXURES AND DOCUMENTS ENDPOINTS
// ----------------------------------------------------

app.post('/api/projects/:id/annexures', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { id } = req.params;

  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  const fileId = 'F' + Date.now() + Math.round(Math.random() * 1000);
  const newFile = {
    id: fileId,
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    data: req.file.buffer.toString('base64')
  };
  db.files = db.files || [];
  db.files.push(newFile);

  const newAnnexure = {
    id: 'AN' + Date.now(),
    projectId: id,
    name: req.file.originalname,
    uploadDate: new Date().toISOString(),
    uploadBy: req.user.role,
    fileUrl: `/api/downloads/${fileId}`,
    size: req.file.size < 1024 * 1024 ? (req.file.size / 1024).toFixed(1) + ' KB' : (req.file.size / (1024 * 1024)).toFixed(1) + ' MB'
  };

  db.annexures = db.annexures || [];
  db.annexures.push(newAnnexure);
  await writeDbDataAsync(db);

  if (req.user) {
    logActivity(req.user.id, req.user.name, req.user.avatar, 'uploaded', `annexure '${req.file.originalname}'`, id);
  }

  res.status(201).json(newAnnexure);
});


app.put('/api/projects/:id/annexures/:annexureId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'Team Member') {
    res.status(403).json({ message: 'Forbidden: Only Managers and Admins can edit annexures.' });
    return;
  }

  const db = await getDbDataAsync();
  const { annexureId } = req.params;
  const { name } = req.body;

  let anIndex = (db.annexures || []).findIndex((an: any) => an.id === annexureId);
  if (anIndex !== -1) {
    db.annexures[anIndex].name = name;
  }

  if (mongoose.connection.readyState === 1) {
    try {
      await Annexure.updateOne({ id: annexureId }, { $set: { name } });
    } catch (err) {
      console.error("Error updating Mongo:", err);
    }
  }

  await writeDbDataAsync(db);

  res.json({ message: 'Annexure updated successfully', name });
});

app.delete('/api/projects/:id/annexures/:annexureId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'Team Member') {
    res.status(403).json({ message: 'Forbidden: Only Managers and Admins can delete annexures.' });
    return;
  }

  const db = await getDbDataAsync();
  const { annexureId } = req.params;

  if (mongoose.connection.readyState === 1) {
    try {
      await Annexure.deleteOne({ id: annexureId });
    } catch (err) {
      console.error("Error deleting from Mongo:", err);
    }
  }

  db.annexures = (db.annexures || []).filter((an: any) => an.id !== annexureId);
  await writeDbDataAsync(db);

  res.json({ message: 'Annexure deleted successfully' });
});

app.get('/api/projects/:id/annexures', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = await getDbDataAsync();
  const list = (db.annexures || []).filter((an: any) => an.projectId === id);
  res.json(list);
});

app.post('/api/projects/:id/documents', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { id } = req.params;

  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const fileId = 'F' + Date.now() + Math.round(Math.random() * 1000);
  const newFile = {
    id: fileId,
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    data: req.file.buffer.toString('base64')
  };
  db.files = db.files || [];
  db.files.push(newFile);

  const newDoc = {
    id: 'D' + Date.now(),
    projectId: id,
    name: req.file.originalname,
    uploadDate: new Date().toISOString(),
    uploadBy: req.user.role,
    size: req.file.size < 1024 * 1024 ? (req.file.size / 1024).toFixed(1) + ' KB' : (req.file.size / (1024 * 1024)).toFixed(1) + ' MB',
    fileUrl: `/api/downloads/${fileId}`
  };

  db.documents = db.documents || [];
  db.documents.push(newDoc);
  await writeDbDataAsync(db);

  logActivity(req.user.id, req.user.name, req.user.avatar, 'uploaded document', `'${req.file.originalname}'`, id);

  res.status(201).json(newDoc);
});

app.get('/api/downloads/:fileId', async (req: Request, res: Response) => {
  const db = await getDbDataAsync();
  const { fileId } = req.params;
  const file = (db.files || []).find((f: any) => f.id === fileId);
  if (!file) {
    res.status(404).json({ message: 'File not found' });
    return;
  }
  
  const buffer = Buffer.from(file.data, 'base64');
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
  res.send(buffer);
});

app.delete('/api/projects/:id/documents/:docId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'Team Member') {
    res.status(403).json({ message: 'Forbidden: Only Managers and Admins can delete documents.' });
    return;
  }

  const db = await getDbDataAsync();
  const { docId } = req.params;

  if (mongoose.connection.readyState === 1) {
    try {
      await Document.deleteOne({ id: docId });
    } catch (err) {
      console.error("Error deleting from Mongo:", err);
    }
  }

  db.documents = (db.documents || []).filter((d: any) => d.id !== docId);
  await writeDbDataAsync(db);

  res.json({ message: 'Document deleted successfully' });
});

app.get('/api/projects/:id/documents', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = await getDbDataAsync();
  const docList = (db.documents || []).filter((d: any) => d.projectId === id).map((d: any) => {
  let mappedRole = 'Admin';
  if (d.uploadBy === 'Admin' || d.uploadBy === 'Project Manager' || d.uploadBy === 'Manager' || d.uploadBy === 'Team Member') {
    mappedRole = d.uploadBy === 'Project Manager' ? 'Manager' : d.uploadBy;
  } else if (d.uploadBy) {
    const user = (db.users || []).find((u: any) => u.name === d.uploadBy || u.id === d.uploadBy);
    if (user && user.role) {
      mappedRole = user.role === 'Project Manager' ? 'Manager' : user.role;
    } else {
      mappedRole = 'Admin';
    }
  }
  return { ...d, uploadBy: mappedRole };
});
  
  const annexureList = (db.annexures || []).filter((d: any) => d.projectId === id).map((an: any) => {
  let mappedRole = 'Admin';
  if (an.uploadBy === 'Admin' || an.uploadBy === 'Project Manager' || an.uploadBy === 'Manager' || an.uploadBy === 'Team Member') {
    mappedRole = an.uploadBy === 'Project Manager' ? 'Manager' : an.uploadBy;
  } else if (an.uploadBy) {
    const user = (db.users || []).find((u: any) => u.name === an.uploadBy || u.id === an.uploadBy);
    if (user && user.role) {
      mappedRole = user.role === 'Project Manager' ? 'Manager' : user.role;
    } else {
      mappedRole = 'Admin';
    }
  }
  return {
    id: an.id,
    projectId: an.projectId,
    name: an.name,
    uploadDate: an.uploadDate,
    uploadBy: mappedRole,
    size: an.size || 'Unknown',
    fileUrl: an.fileUrl
  };
});

  const taskAttachments: any[] = [];
  (db.tasks || []).filter((t: any) => t.projectId === id).forEach((task: any) => {
    (task.attachments || []).forEach((att: any) => {
      
      let mappedRole = 'Admin';
      if (att.uploadedBy === 'Admin' || att.uploadedBy === 'Project Manager' || att.uploadedBy === 'Manager' || att.uploadedBy === 'Team Member') {
        mappedRole = att.uploadedBy === 'Project Manager' ? 'Manager' : att.uploadedBy;
      } else if (att.uploadedBy) {
        const user = (db.users || []).find((u: any) => u.name === att.uploadedBy || u.id === att.uploadedBy);
        if (user && user.role) {
          mappedRole = user.role === 'Project Manager' ? 'Manager' : user.role;
        } else {
          mappedRole = 'Admin';
        }
      }
      taskAttachments.push({
        id: att.id,
        projectId: task.projectId,
        name: att.name,
        uploadDate: att.uploadedAt || new Date().toISOString(),
        uploadBy: mappedRole,
        size: att.size || 'Unknown',
        fileUrl: att.fileUrl
      });
    });
  });

  // deduplicate by fileUrl just in case
  const combined = [...docList, ...annexureList, ...taskAttachments];
  const unique = Array.from(new Map(combined.map(item => [item.fileUrl, item])).values());
  
  // Sort by uploadDate descending
  unique.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

  res.json(unique);
});

// ----------------------------------------------------
// USER DIRECTORY ENDPOINTS (ADMIN ONLY / MEMBERS)
// ----------------------------------------------------

app.get('/api/users/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const userId = req.user?.id;
  const userEmail = req.user?.email;

  const user = db.users.find((u: any) =>
    u.id === userId ||
    (u.email && userEmail && u.email.toLowerCase() === userEmail.toLowerCase())
  );

  if (!user) {
    if (req.user && req.user.email) {
      if (typeof db.empIdCounter !== 'number') {
        db.empIdCounter = db.users.reduce((max: number, u: any) => {
          const match = (u.empId || '').match(/^EMP-(\d+)$/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
      }
      db.empIdCounter += 1;
      const empId = 'EMP-' + db.empIdCounter.toString().padStart(4, '0');
      
      const newUser = {
        id: req.user.id || ('U' + Date.now()),
        empId,
        name: req.user.name || req.user.email.split('@')[0],
        email: req.user.email,
        role: (req.user.email.toLowerCase() === 'admin@example.com' || req.user.email.toLowerCase() === 'rashmeet1309@gmail.com') ? 'Admin' : 'Team Member',
        phone: '',
        department: 'N/A',
        bureau: 'Kanpur Bureau / Print',
        taskCount: '0/0',
        active: true,
        avatar: (req.user as any).picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        passwordHash: ''
      };
      
      db.users.push(newUser);
      await writeDbDataAsync(db);
      res.json(newUser);
      return;
    }

    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(user);
});

app.get('/api/users', authenticateToken, async (req: Request, res: Response) => {
  const db = await getDbDataAsync();
  // Don't send password hashes
  const safeUsers = db.users.map(({ passwordHash, ...rest }: any) => rest);
  res.json(safeUsers);
});

app.post('/api/users', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { name, email, role, phone, department, bureau, password } = req.body;

  const exists = db.users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
  
  // Create in Firebase Auth
  let firebaseUid = '';
  try {
    const userRecord = await getAdminAuth().createUser({
      email,
      password: password || 'password123',
      displayName: name
    });
    firebaseUid = userRecord.uid;
  } catch (err: any) {
    if (err.code !== 'auth/email-already-exists') {
      res.status(400).json({ message: 'Firebase Auth Error: ' + err.message });
      return;
    }
    // If exists in Firebase but not Mongo, maybe we can fetch it?
    // We'll just generate an ID if it failed but we want to proceed.
  }
  if (exists) {
    res.status(400).json({ message: 'User with this email already exists' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password || 'password123', salt);

  if (typeof db.empIdCounter !== 'number') {
    db.empIdCounter = db.users.reduce((max: number, u: any) => {
      const match = (u.empId || '').match(/^EMP-(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
  }
  db.empIdCounter += 1;
  const empId = 'EMP-' + db.empIdCounter.toString().padStart(4, '0');

  const newUser = {
    id: firebaseUid || ('U' + Date.now()),
    empId: empId,
    bureau: bureau || 'Kanpur Bureau / Print',
    name,
    email,
    passwordHash,
    role: role || 'Team Member',
    active: true,
    phone: phone || '',
    department: department || '',
    taskCount: '0/0',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
  };

  db.users.push(newUser);
  await writeDbDataAsync(db);

  if (req.user) {
    logActivity(req.user.id, req.user.name, req.user.avatar, 'added user', `'${name}'`);
  }

  const { passwordHash: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

app.put('/api/users/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { id } = req.params;
  const userIndex = db.users.findIndex((u: any) => u.id === id || u._id === id || String(u._id) === id);

  if (userIndex === -1) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const oldUser = db.users[userIndex];
  const updatedUser = { ...oldUser, ...req.body };

  if (req.body.password) {
    const salt = bcrypt.genSaltSync(10);
    updatedUser.passwordHash = bcrypt.hashSync(req.body.password, salt);
  }

  db.users[userIndex] = updatedUser;
  await writeDbDataAsync(db);

  if (mongoose.connection.readyState === 1) {
    try {
      await User.updateOne({ $or: [{ id }, { _id: id }] }, { $set: updatedUser }).catch(() => User.updateOne({ id }, { $set: updatedUser }));
    } catch (err) {
      console.error("Error updating Mongo user profile:", err);
    }
  }

  if (req.user) {
    logActivity(req.user.id, req.user.name, req.user.avatar, 'updated user profile of', `'${updatedUser.name}'`);
  }

  const { passwordHash: _, ...safeUser } = updatedUser;
  res.json(safeUser);
});

app.delete('/api/users/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const { id } = req.params;
  const user = db.users.find((u: any) => u.id === id || u._id === id || String(u._id) === id || (u.email && u.email.toLowerCase() === id.toLowerCase()));

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const targetEmail = (user.email || '').toLowerCase();
  const targetId = user.id;
  const targetMongoId = user._id ? String(user._id) : '';

  if (mongoose.connection.readyState === 1) {
    try {
      const userConditions: any[] = [];
      if (targetId) userConditions.push({ id: targetId });
      if (id) userConditions.push({ id });
      if (targetMongoId && mongoose.Types.ObjectId.isValid(targetMongoId)) userConditions.push({ _id: targetMongoId });
      if (id && mongoose.Types.ObjectId.isValid(id)) userConditions.push({ _id: id });
      if (targetEmail) userConditions.push({ email: targetEmail });

      if (userConditions.length > 0) {
        await User.deleteMany({ $or: userConditions });
      }
    } catch (err) {
      console.error("Error deleting user from Mongo:", err);
    }
  }

  // Delete from Firebase Auth & Firestore
  try {
    if (targetId) {
      await getAdminAuth().deleteUser(targetId).catch(err => {
        console.warn(`Could not delete user from Firebase Auth: ${err.message}`);
      });
      await getAdminFirestore().collection('users').doc(targetId).delete().catch(err => {
        console.warn(`Could not delete user from Firestore: ${err.message}`);
      });
    }
  } catch (err) {
    console.error("Firebase admin delete user error:", err);
  }

  db.users = db.users.filter((u: any) => {
    if (targetId && u.id === targetId) return false;
    if (targetMongoId && (u._id === targetMongoId || String(u._id) === targetMongoId)) return false;
    if (targetEmail && u.email && u.email.toLowerCase() === targetEmail) return false;
    if (id && (u.id === id || u._id === id || String(u._id) === id)) return false;
    return true;
  });

  if (!db.deletedUsers) {
    db.deletedUsers = [];
  }

  // Nullify manager/assignee in projects and tasks
  let projectsChanged = false;
  if (db.projects) {
    db.projects.forEach((p: any) => {
      if ((targetId && p.managerId === targetId) || (user.name && p.manager === user.name)) {
        p.managerId = '';
        p.manager = 'Unassigned';
        projectsChanged = true;
      }
    });
  }
  let tasksChanged = false;
  if (db.tasks) {
    db.tasks.forEach((t: any) => {
      if ((targetId && t.assigneeId === targetId) || (user.name && t.assignee === user.name)) {
        t.assigneeId = '';
        t.assignee = 'Unassigned';
        tasksChanged = true;
      }
    });
  }
  
  // also update mongo directly
  if (mongoose.connection.readyState === 1) {
    try {
      if (projectsChanged) {
        await Project.updateMany(
          { $or: [{ managerId: targetId }, { manager: user.name }] },
          { $set: { managerId: '', manager: 'Unassigned' } }
        );
      }
      if (tasksChanged) {
        await Task.updateMany(
          { $or: [{ assigneeId: targetId }, { assignee: user.name }] },
          { $set: { assigneeId: '', assignee: 'Unassigned' } }
        );
      }
    } catch (e) {
       console.error(e);
    }
  }

  db.deletedUsers.push({
    id: targetId,
    email: targetEmail,
    deletedAt: new Date().toISOString()
  });


  await writeDbDataAsync(db);

  if (req.user) {
    logActivity(req.user.id, req.user.name, req.user.avatar, 'deleted user', `'${user.name}'`);
  }

  res.json({ message: 'User deleted successfully' });
});

// ----------------------------------------------------
// MILESTONES & ACTIVITIES ENDPOINTS
// ----------------------------------------------------

app.get('/api/milestones', authenticateToken, async (req: Request, res: Response) => {
  const db = await getDbDataAsync();
  const allMilestones: any[] = [];
  if (db.projects) {
    db.projects.forEach((project: any) => {
      if (project.timeline && Array.isArray(project.timeline)) {
        project.timeline.forEach((m: any, index: number) => {
          allMilestones.push({
            id: m.id || m._id || `timeline-${project.id}-${index}`,
            projectId: project.id,
            name: m.title,
            lead: project.manager,
            date: m.date,
            status: m.completed ? 'Completed' : 'Pending'
          });
        });
      }
    });
  }
  // Sort by date or just return. Let's return reversed so newest are first.
  res.json(allMilestones.reverse());
});

app.post('/api/milestones', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ message: 'Forbidden: Only Administrators can create milestones.' });
    return;
  }

  const db = await getDbDataAsync();
  const { name, lead, date, status, projectId } = req.body;
  const newMilestone = {
    id: 'M' + Date.now(),
    projectId: projectId || 'P01',
    name,
    lead: lead || req.user?.name || '',
    date: date || '21 July 2026',
    status: status || 'Pending'
  };
  db.milestones = db.milestones || [];
  db.milestones.push(newMilestone);
  await writeDbDataAsync(db);
  res.status(201).json(newMilestone);
});

app.delete('/api/recent-activities', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ message: 'Forbidden: Only Admins can clear all activity' });
    return;
  }
  const db = await getDbDataAsync();
  db.recentActivity = [];
  await writeDbDataAsync(db);
  res.json({ message: 'Cleared all activities' });
});

app.get('/api/recent-activities', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const role = req.user?.role;
  const userId = req.user?.id;

  if (role === 'Team Member') {
    res.json([]);
    return;
  }

  let rawActivities = db.recentActivity || [];

  if (role === 'Project Manager') {
    const managedProjects = db.projects.filter((p: any) => p.managerId === userId || (p.members || []).includes(userId));
    const managedProjectNames = managedProjects.map((p: any) => (p.name || '').toLowerCase());

    rawActivities = rawActivities.filter((act: any) => {
      if (act.userId === userId) return true;
      const entity = (act.entityName || '').toLowerCase();
      return managedProjectNames.some((pName: string) => pName && entity.includes(pName));
    });
  }

  let activities = rawActivities.map((act: any) => {
    const user = db.users.find((u: any) => u.id === act.userId || u.name === act.userName);
    return {
      ...act,
      userAvatar: user?.avatar || act.userAvatar
    };
  });

  activities.sort((a: any, b: any) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });
  res.json(activities);
});

// ----------------------------------------------------
// GLOBAL NOTIFICATIONS ENDPOINTS
// ----------------------------------------------------

app.get('/api/user-alerts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const notifications = (db.notifications || []).filter((n: any) => n.userId === req.user?.id);
  res.json(notifications);
});

app.put('/api/user-alerts/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  (db.notifications || []).forEach((n: any) => {
    if (n.userId === req.user?.id) {
      n.unread = false;
    }
  });
  await writeDbDataAsync(db);
  res.json({ message: 'All notifications marked as read' });
});

// ----------------------------------------------------
// REPORTS API ENDPOINT
// ----------------------------------------------------

app.get('/api/reports/data', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const db = await getDbDataAsync();
  const tasks = db.tasks;
  const users = db.users;

  // Enhance projects with overdue tasks count and tasks array for reports
  const projects = db.projects.map((p: any) => {
    const pTasks = tasks.filter((t: any) => t.projectId === p.id);
    const overdue = pTasks.filter((t: any) => t.status !== 'Completed' && (t.priority === 'Critical' || t.priority === 'High')).length;
    return { ...p, _overdueCount: overdue, tasks: pTasks };
  });

  // Compute Task Completion Overview (pie chart)
  const completedCount = tasks.filter((t: any) => t.status === 'Completed').length;
  const pendingCount = tasks.filter((t: any) => t.status !== 'Completed' && t.priority !== 'Critical' && t.priority !== 'High').length;
  const overdueCount = tasks.filter((t: any) => t.status !== 'Completed' && (t.priority === 'Critical' || t.priority === 'High')).length;

  const totalTasks = tasks.length || 1; // avoid div by zero
  const pieData = [
    { name: 'Completed', value: Math.round((completedCount / totalTasks) * 100), color: '#3b82f6' },
    { name: 'Pending', value: Math.round((pendingCount / totalTasks) * 100), color: '#0ea5e9' },
    { name: 'Overdue', value: Math.round((overdueCount / totalTasks) * 100), color: '#f43f5e' }
  ];

  // Compute Team Performance
  const teamPerformance = users.map((u: any) => {
    const userTasks = tasks.filter((t: any) => t.assigneeId === u.id);
    const completed = userTasks.filter((t: any) => t.status === 'Completed').length;
    const assigned = userTasks.length;
    const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
    return { name: u.name, assigned, rate: `${rate}%`, _rateRaw: rate };
  }).sort((a: any, b: any) => b._rateRaw - a._rateRaw).slice(0, 4);

  // Compute Monthly Trend Data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendMap = new Map();
  months.forEach(m => trendMap.set(m, { name: m, Completed: 0, Created: 0 }));

  tasks.forEach((t: any) => {
    if (t.createdAt) {
      const date = new Date(t.createdAt);
      if (!isNaN(date.getTime())) {
        const month = months[date.getMonth()];
        const entry = trendMap.get(month);
        if (entry) {
          entry.Created++;
        }
      }
    }
    if (t.status === 'Completed' && t.updatedAt) {
      const date = new Date(t.updatedAt);
      if (!isNaN(date.getTime())) {
        const month = months[date.getMonth()];
        const entry = trendMap.get(month);
        if (entry) {
          entry.Completed++;
        }
      }
    }
  });

  const currentMonthIdx = new Date().getMonth();
  const startIdx = Math.max(0, currentMonthIdx - 5);
  const trendData = Array.from(trendMap.values()).slice(startIdx, currentMonthIdx + 1);

  // Send back everything needed
  res.json({
    projects,
    pieData,
    teamPerformance,
    trendData
  });
});

// ----------------------------------------------------
// GLOBAL SEARCH ENDPOINT
// ----------------------------------------------------

app.get('/api/search', authenticateToken, async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase();
  const db = await getDbDataAsync();

  if (!query) {
    res.json({ projects: [], tasks: [], users: [], activities: [] });
    return;
  }

  const projects = (db.projects || []).filter((p: any) => (p.name || '').toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query));
  const tasks = (db.tasks || []).filter((t: any) => (t.name || '').toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query));
  const users = (db.users || []).filter((u: any) => (u.name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query) || (u.department || u.bureau || '').toLowerCase().includes(query));
  
  const activities = (db.recentActivity || [])
    .filter((a: any) => (a.userName || '').toLowerCase().includes(query) || (a.action || '').toLowerCase().includes(query) || (a.entityName || '').toLowerCase().includes(query))
    .map((act: any) => {
      const user = db.users.find((u: any) => u.id === act.userId || u.name === act.userName);
      return {
        ...act,
        userAvatar: user?.avatar || act.userAvatar
      };
    })
    .sort((a: any, b: any) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

  res.json({ projects, tasks, users, activities });
});

// ----------------------------------------------------
// VITE OR PRODUCTION STATIC FILE HANDLER
// ----------------------------------------------------

// Global Error Handler for API routes to guarantee JSON responses
app.use('/api', (err: any, req: any, res: any, next: any) => {
  console.error('API Error:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Catch-all for unmatched API routes so they return JSON instead of falling through to SPA fallback
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));


    app.get('*', async (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
