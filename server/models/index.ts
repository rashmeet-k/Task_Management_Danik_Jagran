import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  id: String,
  empId: String,
  projectId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  assignee: { type: String },
  assigneeId: { type: String },
  priority: { type: String, default: 'Medium' },
  dueDate: { type: String },
  status: { type: String, default: 'To Do' },
  progress: { type: Number, default: 0 },
  comments: [{
    id: String,
  empId: String,
    userId: String,
    userName: String,
    userAvatar: String,
    content: String,
    timestamp: String
  }],
  attachments: [{
    id: String,
  empId: String,
    name: String,
    fileUrl: String,
    uploadedBy: String,
    uploadedAt: String
  }]
}, { timestamps: true, strict: false });

const ProjectSchema = new mongoose.Schema({
  id: String,
  empId: String,
  teamId: { type: String },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  progress: { type: Number, default: 0 },
  startDate: { type: String },
  endDate: { type: String },
  manager: { type: String },
  managerId: { type: String },
  status: { type: String, default: 'In Progress' },
  priority: { type: String, default: 'Medium' },
  members: [{ type: String }],
  timeline: [{
    id: String,
  empId: String,
    title: String,
    date: String,
    completed: Boolean
  }]
}, { timestamps: true, strict: false });

const ActivitySchema = new mongoose.Schema({
  id: String,
  empId: String,
  userId: String,
  userName: String,
  userAvatar: String,
  action: String,
  entityName: String,
  timestamp: String
}, { timestamps: true, strict: false });

const NotificationSchema = new mongoose.Schema({
  id: String,
  empId: String,
  userId: String,
  text: String,
  unread: { type: Boolean, default: true },
  timestamp: String
}, { timestamps: true, strict: false });

export const Task = mongoose.model('Task', TaskSchema);
export const Project = mongoose.model('Project', ProjectSchema);
export const Activity = mongoose.model('Activity', ActivitySchema);
export const Notification = mongoose.model('Notification', NotificationSchema);

const FileRecordSchema = new mongoose.Schema({
  id: String,
  empId: String,
  name: String,
  mimeType: String,
  data: String // Base64
}, { timestamps: true, strict: false });

export const FileRecord = mongoose.model('FileRecord', FileRecordSchema);

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI is not defined. Skipping MongoDB connection.');
    return false;
  }
  
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    return false;
  }
};

const UserSchema = new mongoose.Schema({
  id: String,
  empId: String,
  name: String,
  email: String,
  role: String,
  bureau: String,
  active: Boolean,
  avatar: String,
  passwordHash: String,
  department: String,
  phone: String,
  taskCount: String
}, { timestamps: true, strict: false });

const MilestoneSchema = new mongoose.Schema({
  id: String,
  empId: String,
  projectId: String,
  name: String,
  lead: String,
  date: String,
  status: String
}, { timestamps: true, strict: false });

const DocumentSchema = new mongoose.Schema({
  id: String,
  empId: String,
  projectId: String,
  name: String,
  uploadDate: String,
  uploadBy: String,
  size: String,
  fileUrl: String
}, { timestamps: true, strict: false });

const AnnexureSchema = new mongoose.Schema({
  id: String,
  empId: String,
  projectId: String,
  name: String,
  uploadDate: String,
  fileUrl: String
}, { timestamps: true, strict: false });

export const User = mongoose.model('User', UserSchema);
export const Milestone = mongoose.model('Milestone', MilestoneSchema);
export const Document = mongoose.model('Document', DocumentSchema);
export const Annexure = mongoose.model('Annexure', AnnexureSchema);
