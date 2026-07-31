export interface NotificationPreferences {
  emailAlerts: boolean;
  taskAssignments: boolean;
  projectUpdates: boolean;
  weeklyReport: boolean;
  desktopNotifications: boolean;
  urgentAlerts: boolean;
}

export interface User {
  empId?: string;
  id: string;
  
  name: string;
  email: string;
  role: 'Admin' | 'Project Manager' | 'Team Member';
  active: boolean;
  phone: string;
  department: string;
  taskCount: string;
  avatar: string;
  notificationPreferences?: NotificationPreferences;
}

export interface Project {
  id: string;
  teamId: string;
  name: string;
  description: string;
  progress: number;
  startDate: string;
  endDate: string;
  manager: string;
  managerId: string;
  status: 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled' | 'Pending';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  members: string[]; // User IDs
  timeline: TimelineMilestone[];
}

export interface TimelineMilestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  assignee: string;
  assigneeId: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  progress: number;
  comments: Comment[];
  attachments: Attachment[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
}

export interface Attachment {
  id: string;
  name: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  lead: string;
  date: string;
  status: 'In progress' | 'Pending' | 'Completed' | 'Delayed';
}

export interface RecentActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: string;
  entityName: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  unread: boolean;
  timestamp: string;
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  uploadDate: string;
  uploadBy: string;
  size: string;
  fileUrl: string;
}

export interface Annexure {
  id: string;
  projectId: string;
  name: string;
  uploadDate: string;
  uploadBy?: string;
  fileUrl: string;
  size?: string;
}
