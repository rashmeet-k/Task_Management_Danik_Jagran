import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, 
  Shield, 
  User, 
  Eye,
  Trash2,
  Key, 
  Check, 
  Camera, 
  Mail, 
  Phone, 
  Building, 
  Save, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  BadgeCheck, 
  Sparkles,
  Smartphone
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { NotificationPreferences } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, token, updateProfile } = useAuth();
  
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'overview'>('profile');

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setFormPhone] = useState(user?.phone || '');
  const [dept, setFormDept] = useState(user?.department || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Avatar Upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');

  // Notification Preferences state
  const defaultNotifs: NotificationPreferences = {
    emailAlerts: true,
    taskAssignments: true,
    projectUpdates: true,
    weeklyReport: false,
    desktopNotifications: true,
    urgentAlerts: true,
  };

  const [notifs, setNotifs] = useState<NotificationPreferences>(
    user?.notificationPreferences || defaultNotifs
  );
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');
  const [notifError, setNotifError] = useState('');

  // Sync state when user prop changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setFormPhone(user.phone || '');
      setFormDept(user.department || '');
      if (user.notificationPreferences) {
        setNotifs(user.notificationPreferences);
      }
    }
  }, [user]);

  // Calculate profile completion percentage
  const calcCompletion = () => {
    let score = 0;
    if (user?.name) score += 20;
    if (user?.email) score += 20;
    if (user?.avatar) score += 20;
    if (user?.phone) score += 20;
    if (user?.department) score += 20;
    return score;
  };

  const completionScore = calcCompletion();

  // Handle Avatar Change
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ''; // Allow re-uploading the same file
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image file size must be less than 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError('');
    setAvatarMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const fileUrl = data.fileUrl;
        
        // Update Firestore if user exists
        if (user?.id) {
          try {
            await updateDoc(doc(db, 'users', user.id), { avatar: fileUrl });
          } catch (fsErr) {
            console.warn('Firestore updateDoc failed for avatar:', fsErr);
          }
          
          // Update Backend Server
          await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ avatar: fileUrl })
          });
          
          updateProfile({ avatar: fileUrl });
          setAvatarMsg('Profile picture updated successfully!');
        }
      } else {
        setAvatarError('Failed to upload profile image.');
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setAvatarError('Error uploading image. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id || !user.avatar) return;
    
    setIsUploadingAvatar(true);
    setAvatarError('');
    setAvatarMsg('');

    try {
      // Update Firestore
      try {
        await updateDoc(doc(db, 'users', user.id), { avatar: '' });
      } catch (fsErr) {
        console.warn('Firestore updateDoc failed for avatar:', fsErr);
      }
      
      // Update Backend Server
      await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: '' })
      });
      
      updateProfile({ avatar: undefined });
      setAvatarMsg('Profile picture deleted successfully!');
    } catch (err) {
      console.error('Error deleting avatar:', err);
      setAvatarError('Error deleting image. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle Profile Form Submission
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    setIsSavingProfile(true);

    try {
      // 1. Try updating Firebase Auth Email if currentUser exists and email changed
      if (auth.currentUser && auth.currentUser.email !== email && email) {
        try {
          const { updateEmail } = await import('firebase/auth');
          await updateEmail(auth.currentUser, email);
        } catch (fbErr: any) {
          console.warn('Firebase updateEmail warning:', fbErr?.message || fbErr);
        }
      }

      // 2. Update Firestore
      if (user?.id) {
        try {
          await updateDoc(doc(db, 'users', user.id), {
            name,
            email,
            phone,
            department: dept
          });
        } catch (fsErr) {
          console.warn('Firestore updateDoc failed:', fsErr);
        }
      }

      // 3. Update Backend API
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          department: dept
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        updateProfile({
          name: data.name || name,
          email: data.email || email,
          phone: data.phone || phone,
          department: data.department || dept
        });
        setProfileMsg('Profile updated successfully!');
      } else {
        const errData = await res.json().catch(() => ({})).catch(() => ({}));
        setProfileError(errData.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      console.error(err);
      setProfileError('An unexpected error occurred while saving profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change Submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg('');
    setPassError('');

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setIsChangingPass(true);

    try {
      let passwordUpdated = false;

      // 1. Firebase Auth password update
      if (auth.currentUser && user?.email) {
        try {
          const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
          const credential = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(auth.currentUser, credential);
          await updatePassword(auth.currentUser, newPassword);
          passwordUpdated = true;
        } catch (firebaseErr: any) {
          console.warn('Firebase reauth/updatePassword error:', firebaseErr);
        }
      }

      // 2. Backend API password update
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (res.ok) {
        passwordUpdated = true;
      }

      if (passwordUpdated) {
        setPassMsg('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errData = await res.json().catch(() => ({})).catch(() => ({}));
        setPassError(errData.message || 'Failed to update password. Please verify your current password.');
      }
    } catch (err) {
      console.error(err);
      setPassError('An unexpected error occurred while changing password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Handle Notification Toggle
  const toggleNotif = (key: keyof NotificationPreferences) => {
    setNotifs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handle Notification Preferences Save
  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifMsg('');
    setNotifError('');
    setIsSavingNotifs(true);

    try {
      // 1. Update Firestore
      if (user?.id) {
        try {
          await updateDoc(doc(db, 'users', user.id), {
            notificationPreferences: notifs
          });
        } catch (fsErr) {
          console.warn('Firestore updateDoc failed for notifications:', fsErr);
        }
      }

      // 2. Update Backend API
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationPreferences: notifs })
      });

      if (res.ok) {
        updateProfile({ notificationPreferences: notifs });
        setNotifMsg('Notification preferences saved successfully!');
      } else {
        const errData = await res.json().catch(() => ({})).catch(() => ({}));
        setNotifError(errData.message || 'Failed to save notification preferences.');
      }
    } catch (err) {
      console.error(err);
      setNotifError('An error occurred while saving notification preferences.');
    } finally {
      setIsSavingNotifs(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn pb-12">
      
      {/* Left Navigation Card & User Profile Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-6 self-start">
        
        {/* Profile Card Header */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="relative group">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={user?.name || 'User Profile'}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover border-2 border-[#00adef]/30 shadow-md transition-all group-hover:brightness-50 group-hover:border-[#00adef]"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/50 gap-1.5 backdrop-blur-sm">
              {isUploadingAvatar ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <>
                  {user?.avatar && (
                    <a 
                      href={user.avatar}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View Profile Picture"
                      className="p-1 hover:bg-white/20 rounded-full transition-colors inline-flex"
                    >
                      <Eye className="w-3.5 h-3.5 text-white" />
                    </a>
                  )}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    title="Change Profile Picture"
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </button>
                  {user?.avatar && (
                    <button 
                      onClick={handleDeleteAvatar}
                      title="Delete Profile Picture"
                      className="p-1 hover:bg-red-500/80 rounded-full transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-black text-base text-slate-800 truncate">{user?.name}</span>
              <BadgeCheck className="w-4 h-4 text-[#00adef] shrink-0" />
            </div>
            <span className="font-sans text-xs text-slate-500 truncate">{user?.email}</span>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider rounded-md bg-sky-50 text-[#00adef] border border-sky-200">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Completion Indicator */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-sans font-bold">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00adef]" /> Profile Completion
            </span>
            <span className="text-[#00adef]">{completionScore}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-[#00adef] h-full rounded-full transition-all duration-500"
              style={{ width: `${completionScore}%` }}
            />
          </div>
          {completionScore < 100 && (
            <p className="text-[10px] font-sans text-slate-400">
              Add your phone number & department to reach 100%.
            </p>
          )}
        </div>

        {/* Avatar Alert Feedback */}
        {avatarMsg && (
          <p className="text-xs text-emerald-600 font-sans font-bold bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 flex items-center gap-1.5 animate-fadeIn">
            <Check className="w-4 h-4 shrink-0" /> {avatarMsg}
          </p>
        )}
        {avatarError && (
          <p className="text-xs text-red-500 font-sans font-bold bg-red-50 p-2.5 rounded-lg border border-red-100 flex items-center gap-1.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" /> {avatarError}
          </p>
        )}

        {/* Left Navigation Tabs */}
        <nav className="flex flex-col gap-1.5">
          <span className="px-3 py-1 text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">
            Account Management
          </span>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center justify-between py-2.5 px-3.5 rounded-xl text-xs font-sans font-bold transition-all text-left ${
              activeTab === 'profile'
                ? 'bg-[#00adef] text-white shadow-md shadow-[#00adef]/20'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <User className="w-4 h-4" /> Personal Profile
            </div>
            {activeTab === 'profile' && <Check className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`flex items-center justify-between py-2.5 px-3.5 rounded-xl text-xs font-sans font-bold transition-all text-left ${
              activeTab === 'password'
                ? 'bg-[#00adef] text-white shadow-md shadow-[#00adef]/20'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4" /> Security & Password
            </div>
            {activeTab === 'password' && <Check className="w-3.5 h-3.5" />}
          </button>


          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center justify-between py-2.5 px-3.5 rounded-xl text-xs font-sans font-bold transition-all text-left ${
              activeTab === 'overview'
                ? 'bg-[#00adef] text-white shadow-md shadow-[#00adef]/20'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4" /> Account Overview
            </div>
            {activeTab === 'overview' && <Check className="w-3.5 h-3.5" />}
          </button>
        </nav>
      </div>

      {/* Right Content Panels */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        {/* 1. PERSONAL PROFILE FORM TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="font-sans font-bold text-base text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#00adef]" /> Personal Profile Details
                </h2>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Update your contact information and full display name.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
              
              {/* Profile Avatar Card inside form */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <img
                    src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt="User"
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full object-cover border-2 border-slate-200"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-full transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-sans font-bold text-xs text-slate-800">Profile Picture</span>
                  <span className="font-sans text-[11px] text-slate-400 mt-0.5">
                    JPG, PNG, or WEBP up to 5MB. Click image to upload.
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-xs font-sans font-bold text-[#00adef] hover:underline self-start flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" /> Upload New Photo
                  </button>
                </div>
              </div>

              {/* Name & Email Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-sans font-bold text-slate-600 uppercase flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" /> Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-[#00adef] focus:bg-white focus:ring-2 focus:ring-[#00adef]/10 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-sans font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-[#00adef] focus:bg-white focus:ring-2 focus:ring-[#00adef]/10 transition-all"
                  />
                </div>
              </div>

              {/* Phone & Department Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-sans font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-[#00adef] focus:bg-white focus:ring-2 focus:ring-[#00adef]/10 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-sans font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-400" /> Department
                  </label>
                  <input
                    type="text"
                    value={dept}
                    onChange={(e) => setFormDept(e.target.value)}
                    placeholder="e.g. Editorial, Production, Reporting"
                    className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-[#00adef] focus:bg-white focus:ring-2 focus:ring-[#00adef]/10 transition-all"
                  />
                </div>
              </div>

              {/* Role Read-Only Field */}
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-sans font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Shield className="w-3 h-3 text-slate-400" /> Access Role
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.role || 'Team Member'}
                    className="bg-slate-100 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Alert Feedback Messages */}
              {profileMsg && (
                <div className="text-xs text-[#00adef] font-sans font-bold bg-sky-50 p-3 rounded-xl border border-sky-200 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00adef]" /> {profileMsg}
                </div>
              )}

              {profileError && (
                <div className="text-xs text-red-600 font-sans font-bold bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" /> {profileError}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-2 border-t border-slate-50">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-[#00adef] hover:bg-sky-500 active:scale-98 text-white font-sans text-xs font-bold px-6 py-3 rounded-xl shadow-md shadow-[#00adef]/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. SECURITY & PASSWORD TAB */}
        {activeTab === 'password' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="font-sans font-bold text-base text-slate-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" /> Security & Password Management
                </h2>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Change your password to keep your account secure and protected.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-sans font-bold text-slate-600 uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-sans font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Key className="w-3 h-3 text-slate-400" /> New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-sans font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Key className="w-3 h-3 text-slate-400" /> Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Password Status Messages */}
              {passMsg && (
                <div className="text-xs text-emerald-700 font-sans font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> {passMsg}
                </div>
              )}

              {passError && (
                <div className="text-xs text-red-600 font-sans font-bold bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" /> {passError}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-2 border-t border-slate-50">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-sans text-xs font-bold px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isChangingPass ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Updating Password...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" /> Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 4. ACCOUNT OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="font-sans font-bold text-base text-slate-800 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-600" /> Account Overview & Information
                </h2>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  System metadata, account identifier, and active permissions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                <span className="text-[10px] font-sans font-bold text-slate-400 uppercase">User ID</span>
                <span className="font-mono text-xs text-slate-800 font-semibold">{user?.id}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                <span className="text-[10px] font-sans font-bold text-slate-400 uppercase">Account Status</span>
                <span className="font-sans text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Account
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                <span className="text-[10px] font-sans font-bold text-slate-400 uppercase">Role Level</span>
                <span className="font-sans text-xs text-slate-800 font-semibold">{user?.role}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                <span className="text-[10px] font-sans font-bold text-slate-400 uppercase">Email</span>
                <span className="font-sans text-xs text-slate-800 font-semibold">{user?.email}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                <span className="text-[10px] font-sans font-bold text-slate-400 uppercase">Department</span>
                <span className="font-sans text-xs text-slate-800 font-semibold">{user?.department || 'Editorial'}</span>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
