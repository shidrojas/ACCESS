// TeacherProjectDashboard.jsx (updated with archive confirmation modal and activity click details)

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import "../TeacherProjectForms/TPD.css";

// ────────────────────────────────────────────────
// Initial data (empty - will be populated from API)
// ────────────────────────────────────────────────
const teacherInitialTasks = {
  todo: [],
  inprogress: [],
  review: [],
  done: []
};

const teacherColumns = [
  { key: "todo", label: "To Do", color: "#20c5e0" },
  { key: "inprogress", label: "In Progress", color: "#fd8d32" },
  { key: "review", label: "For Review", color: "#e15050" },
  { key: "done", label: "Done", color: "#69d186" }
];

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
const isOverdue = (dueDate, status, completedAt) => {
  if (!dueDate || dueDate === "TBD") return false;
  
  const dueDateTime = new Date(dueDate).getTime();
  const now = new Date().getTime();
  
  if (status === "Done") {
    if (!completedAt) return false;
    const completedDateTime = new Date(completedAt).getTime();
    return completedDateTime > dueDateTime;
  }
  
  return now > dueDateTime;
};

const getOverdueStatus = (task) => {
  if (!task.due || task.due === "TBD") return null;
  
  const dueDateTime = new Date(task.due).getTime();
  
  if (task.status === "Done") {
    if (task.completedAt) {
      const completedDateTime = new Date(task.completedAt).getTime();
      if (completedDateTime > dueDateTime) {
        return "Late";
      }
    }
    return null;
  }
  
  const now = new Date().getTime();
  if (now > dueDateTime) {
    return "Overdue";
  }
  
  return null;
};

const getAssignedDisplay = (assigned) => {
  if (Array.isArray(assigned)) {
    return assigned.length > 0 ? assigned.join(", ") : "—";
  }
  return assigned || "—";
};

const getInitials = (name) => {
  if (!name) return "";
  return name.split(" ").map(n => n[0]).join("").toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === "TBD") return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const statusToColumn = {
  "To Do": "todo",
  "In Progress": "inprogress",
  "For Review": "review",
  "Done": "done"
};

const columnToStatus = {
  "todo": "To Do",
  "inprogress": "In Progress",
  "review": "For Review",
  "done": "Done"
};

const formatDateTime = (dateStr) => {
  if (!dateStr || dateStr === "TBD") return "TBD";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric",
    hour: '2-digit',
    minute: '2-digit'
  });
};

const isTaskRejected = (task) => {
  if (!task || !task.assignedIds) return false;
  
  if (task.status === "For Review" || task.status === "Done") {
    return false;
  }
  
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const currentUserId = storedUser?.UserID || storedUser?.user_id || storedUser?.id;
  
  if (task.rejectedUsers && task.rejectedUsers.includes(currentUserId)) {
    return true;
  }
  
  if (task.assigneeDetails && task.assigneeDetails.length > 0) {
    const currentUserAssignee = task.assigneeDetails.find(
      a => a.UserID === currentUserId
    );
    if (currentUserAssignee && currentUserAssignee.is_rejected) {
      return true;
    }
  }
  
  return false;
};

// Add Task Modal (with enhanced design)
function AddTaskModal({ show, onClose, onSave, projectId, projectName, projectMembers, isArchived, currentUserRole }) {
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [status, setStatus] = useState("To Do");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");
  const [assigneeSearchTerm, setAssigneeSearchTerm] = useState("");
  
  // Custom Alert Popup
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");

  const showCustomAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertPopup(true);
  };

  const filteredMembers = projectMembers?.filter(member => {
    if (!assigneeSearchTerm.trim()) return true;
    const searchLower = assigneeSearchTerm.toLowerCase();
    const fullName = `${member.FirstName} ${member.LastName}`.toLowerCase();
    const email = (member.Email || '').toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  }) || [];

  const canAddTasks = currentUserRole === 'Host' || currentUserRole === 'Co-Host';
  
  if (!show || isArchived || !canAddTasks) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({
      name: file.name,
      file: file,
      size: file.size,
      type: file.type,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      uploading: false,
      progress: 0
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => {
      const updated = [...prev];
      if (updated[index]?.previewUrl) URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleAssignedChange = (memberId) => {
    setAssignedTo(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const uploadAttachments = async (taskId) => {
    if (attachments.length === 0) return [];
    
    setUploading(true);
    const formData = new FormData();
    
    attachments.forEach(att => {
      formData.append('attachments[]', att.file);
    });
    
    formData.append('TaskID', taskId);
    
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    formData.append('UserID', userId);
    
    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/tasks/upload_attachment.php", {
        method: "POST",
        body: formData
      });
      
      const result = await response.json();
      
      if (result.status === "success") {
        return result.uploaded_files || [];
      } else {
        console.error("Upload failed:", result.message);
        return [];
      }
    } catch (err) {
      console.error("Error uploading attachments:", err);
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!taskName.trim()) {
      setWarning("Task name is required");
      return;
    }

    if (assignedTo.length === 0) {
      setWarning("Please assign the task to at least one member");
      return;
    }

    setLoading(true);
    setWarning("");

    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const taskData = {
        ProjectID: projectId,
        TaskName: taskName,
        Description: description,
        AssignedTo: assignedTo.join(','),
        Status: status,
        StartDate: startDate || null,
        DueDate: dueDate || null,
        UserID: userId
      };

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/create_task.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData)
      });

      const result = await response.json();

      if (result.status === "success") {
        const newTask = result.task;
        
        let uploadedFiles = [];
        if (attachments.length > 0) {
          uploadedFiles = await uploadAttachments(newTask.TaskID);
        }
        
        const formattedTask = {
          id: newTask.TaskID.toString(),
          content: newTask.TaskName,
          description: newTask.Description,
          assigned: newTask.AssignedToNames || [],
          assignedIds: newTask.AssignedToIds || [],
          due: newTask.DueDate || "TBD",
          status: newTask.Status,
          attachments: uploadedFiles.map(f => ({
            id: f.AttachmentID,
            name: f.FileName,
            url: f.FilePath,
            size: f.FileSize,
            uploadedBy: "You",
            uploadedAt: new Date().toISOString()
          })),
          comments: [],
          projectName: projectName,
          projectId: projectId,
          createdBy: newTask.CreatedBy,
          createdByName: newTask.CreatedByName
        };

        onSave(formattedTask);
        
        setTaskName("");
        setDescription("");
        setAssignedTo([]);
        setDueDate("");
        setStartDate("");
        setStatus("To Do");
        setAttachments([]);
        onClose();
      } else {
        setWarning(result.message || "Failed to create task");
      }
    } catch (err) {
      console.error("Error creating task:", err);
      setWarning("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getStatusClass = (status) => {
    if (status === "To Do") return "todo";
    if (status === "In Progress") return "inprogress";
    if (status === "For Review") return "review";
    if (status === "Done") return "done";
    return "todo";
  };

  return (
    <div className="teacher-modal-backdrop" onClick={onClose}>
      {/* Custom Alert Popup */}
      {showAlertPopup && (
        <div className="modern-popup-overlay">
          <div className="modern-popup" style={{ maxWidth: "400px" }}>
            <div className={`modern-popup-header ${alertType}`} style={{
              background: alertType === "success" 
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : alertType === "error"
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : alertType === "warning"
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            }}>
              <h3>
                {alertType === "success" && "✓ Success"}
                {alertType === "error" && "✗ Error"}
                {alertType === "warning" && "⚠ Warning"}
                {alertType === "info" && "ℹ Information"}
              </h3>
            </div>
            <div className="modern-popup-content" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1rem", margin: "20px 0", color: "#374151" }}>
                {alertMessage}
              </p>
            </div>
            <div className="modern-popup-footer centered">
              <button 
                className="modern-btn modern-btn-primary" 
                onClick={() => setShowAlertPopup(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="teacher-create-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="teacher-create-modal-header">
          <div className="teacher-create-header-left">
            <span className="teacher-create-header-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Task
            </span>
            <h2 className="teacher-create-header-title">Create User Story</h2>
            <p className="teacher-create-header-subtitle">Fill in the details below to create a new user story</p>
          </div>
          <button className="teacher-create-close-btn" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {warning && (
          <div className="teacher-create-warning-banner">
            <div className="teacher-create-warning-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="teacher-create-warning-content">
              <p className="teacher-create-warning-title">Validation Error</p>
              <p className="teacher-create-warning-text">{warning}</p>
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div className="teacher-create-body">
          {/* Main content */}
          <div className="teacher-create-main">
            <div className="teacher-create-project-bar">
              <div className="teacher-create-project-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="teacher-create-project-info">
                <span className="teacher-create-project-label">Project</span>
                <span className="teacher-create-project-name">{projectName || "SAMPLE PROJECT 1"}</span>
              </div>
            </div>

            <div className="teacher-create-field">
              <label className="teacher-create-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="17" y1="10" x2="3" y2="10" />
                  <line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="21" y1="14" x2="3" y2="14" />
                  <line x1="17" y1="18" x2="3" y2="18" />
                </svg>
                Subject
              </label>
              <input 
                className="teacher-create-input" 
                placeholder="Enter the subject of the task" 
                value={taskName}
                onChange={e => setTaskName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="teacher-create-field">
              <label className="teacher-create-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Task Description
              </label>
              <textarea 
                className="teacher-create-textarea" 
                placeholder="Describe the task in detail..." 
                rows={5}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="teacher-create-field">
              <label className="teacher-create-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                Attachments
              </label>
              <div className="teacher-create-upload-zone" onClick={() => document.getElementById('teacher-create-file-upload').click()}>
                <div className="teacher-create-upload-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="teacher-create-upload-title">
                  {uploading ? "Uploading..." : "Drop files or click to browse"}
                </p>
                <p className="teacher-create-upload-hint">Supports images, documents, and more</p>
                <input 
                  id="teacher-create-file-upload"
                  type="file" 
                  multiple 
                  hidden 
                  onChange={handleFileChange} 
                  disabled={uploading} 
                />
              </div>

              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                  {attachments.map((att, idx) => (
                    <div key={idx} className="teacher-create-attachment-preview">
                      {att.previewUrl ? (
                        <img src={att.previewUrl} alt={att.name} />
                      ) : (
                        <div className="teacher-create-attachment-icon">
                          {att.name.split('.').pop().toUpperCase()}
                        </div>
                      )}
                      <div className="teacher-create-attachment-info">
                        <span className="teacher-create-attachment-name">{att.name}</span>
                        <span className="teacher-create-attachment-size">{formatFileSize(att.size)}</span>
                      </div>
                      <button
                        className="teacher-create-attachment-remove"
                        onClick={() => removeAttachment(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="teacher-create-sidebar">
            <div className="teacher-create-sidebar-heading">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Task Properties
            </div>

            <div className="teacher-create-sidebar-field">
              <label className="teacher-create-sidebar-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Status
              </label>
              <div className="teacher-create-sidebar-status-grid">
                {["To Do", "In Progress", "For Review", "Done"].map((s) => (
                  <div 
                    key={s} 
                    className={`teacher-create-sidebar-status-chip ${getStatusClass(s)} ${status === s ? 'selected' : ''}`}
                    onClick={() => setStatus(s)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="teacher-create-sidebar-status-dot" />
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <div className="teacher-create-sidebar-field">
              <label className="teacher-create-sidebar-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Due Date
              </label>
              <input 
                type="datetime-local" 
                className="teacher-create-sidebar-input" 
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
              <small style={{ color: '#888', fontSize: '10px', marginTop: '2px' }}>
                Include time for deadline
              </small>
            </div>

            <div className="teacher-create-sidebar-field">
              <label className="teacher-create-sidebar-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Start Date (Optional)
              </label>
              <input 
                type="datetime-local" 
                className="teacher-create-sidebar-input" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div className="teacher-create-sidebar-field">
              <label className="teacher-create-sidebar-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Assign to
              </label>
              
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#999"
                  style={{ 
                    position: 'absolute', 
                    left: '10px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                >
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search members by name or email..."
                  value={assigneeSearchTerm}
                  onChange={(e) => setAssigneeSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 10px 10px 34px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {assigneeSearchTerm && (
                  <button
                    onClick={() => setAssigneeSearchTerm("")}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#999',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px 8px'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="teacher-create-sidebar-members" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member, i) => {
                    const isSelected = assignedTo.includes(member.UserID);
                    return (
                      <div 
                        key={member.UserID} 
                        className={`teacher-create-sidebar-member ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleAssignedChange(member.UserID)}
                      >
                        <div className={`teacher-create-sidebar-member-avatar av-${(i % 4) + 1}`}>
                          {getInitials(`${member.FirstName} ${member.LastName}`)}
                        </div>
                        <div className="teacher-create-sidebar-member-info">
                          <span className="teacher-create-sidebar-member-name">
                            {member.FirstName} {member.LastName}
                          </span>
                          <span className="teacher-create-sidebar-member-email">{member.Email}</span>
                        </div>
                        <div className="teacher-create-sidebar-member-check">
                          {isSelected ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#20c5e0" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>
                    No members found matching "{assigneeSearchTerm}"
                  </div>
                )}
              </div>
              <small style={{ color: '#666', marginTop: '8px', display: 'block', fontSize: '11px' }}>
                Click on members to assign
              </small>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="teacher-create-modal-footer">
          <div className="teacher-create-footer-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            All fields are required unless marked optional
          </div>
          <div className="teacher-create-footer-actions">
            <button className="teacher-create-cancel-btn" onClick={onClose} disabled={loading || uploading}>
              Cancel
            </button>
            <button 
              className="teacher-create-save-btn" 
              onClick={handleSave}
              disabled={loading || uploading}
            >
              {loading ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Saving...
                </>
              ) : uploading ? (
                "Uploading..."
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Create Task
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// TeacherTaskDetailModal Component - Updated with status dropdown that saves on save button click
function TeacherTaskDetailModal({ show, onClose, task, setTask, onSave, onArchiveTask, onRestoreTask, projectMembers, isArchived, currentUserRole, onApproveRequest, onRejectRequest }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [comments, setComments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [canUpdateStatus, setCanUpdateStatus] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionReason, setPermissionReason] = useState("");
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [autoMoveCompleted, setAutoMoveCompleted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [assigneeSearchTerm, setAssigneeSearchTerm] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusDropdownRef, setStatusDropdownRef] = useState(null);
  const [statusChanged, setStatusChanged] = useState(false);
  
  // Custom Alert Popup
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");

  const showCustomAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertPopup(true);
  };

  const filteredProjectMembers = projectMembers?.filter(member => {
    if (!assigneeSearchTerm.trim()) return true;
    const searchLower = assigneeSearchTerm.toLowerCase();
    const fullName = `${member.FirstName} ${member.LastName}`.toLowerCase();
    const email = (member.Email || '').toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  }) || [];

  const [editableTask, setEditableTask] = useState({
    content: "",
    description: "",
    due: "",
    startDate: "",
    assigned: [],
    assignedIds: []
  });
  
  const [originalStatus, setOriginalStatus] = useState("");

  const formatDateForInput = (dateStr) => {
    if (!dateStr || dateStr === "TBD") return "";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef && !statusDropdownRef.contains(event.target)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusDropdownRef]);

  const canArchive = currentUserRole === 'Host' || currentUserRole === 'Co-Host';
  
  // Check if this is an archived task or permission request
  const isArchivedTask = task?.isArchivedTask === true;
  const isPermissionRequest = task?.isPermissionRequest === true;
  const isReadOnly = isArchived || isArchivedTask || isPermissionRequest;

  // Add this after checking isPermissionRequest
const canRestore = task?.canRestore === true && (currentUserRole === 'Host' || currentUserRole === 'Co-Host');
  
  // Update the canEdit check
  const canEdit = !isReadOnly && (currentUserRole === 'Host' || currentUserRole === 'Co-Host');
  
  // Update the canChangeStatus check
  const canChangeStatus = !isReadOnly && (currentUserRole === 'Host' || currentUserRole === 'Co-Host');

  const isAssigned = () => {
    if (!task || !task.assignedIds) return false;
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser?.UserID || storedUser?.user_id || storedUser?.id;
    return task.assignedIds.includes(userId);
  };

  const isInToDo = task?.status === 'To Do';
  const canMoveToReview = task?.status === "In Progress" && !isArchived && !isArchivedTask && !isPermissionRequest && (canEdit || canUpdateStatus);

  const getAvailableStatuses = () => {
    const statuses = [];
    const currentStatus = editableTask.status || task?.status;
    
    if (currentStatus === 'To Do') {
      statuses.push({ value: 'In Progress', label: 'In Progress', color: '#fd8d32' });
    } else if (currentStatus === 'In Progress') {
      statuses.push({ value: 'For Review', label: 'For Review', color: '#e15050' });
      statuses.push({ value: 'Done', label: 'Done', color: '#69d186' });
    } else if (currentStatus === 'For Review') {
      statuses.push({ value: 'Done', label: 'Done', color: '#69d186' });
      statuses.push({ value: 'In Progress', label: 'In Progress', color: '#fd8d32' });
    } else if (currentStatus === 'Done') {
      statuses.push({ value: 'In Progress', label: 'In Progress', color: '#fd8d32' });
    }
    
    return statuses;
  };

  const handleStatusSelect = (newStatus) => {
    if (!canChangeStatus || isArchived || isArchivedTask || isPermissionRequest) return;
    
    setEditableTask(prev => ({
      ...prev,
      status: newStatus
    }));
    
    setStatusChanged(true);
    setShowStatusDropdown(false);
  };

  useEffect(() => {
    if (task) {
      setEditableTask({
        content: task.content || "",
        description: task.description || "",
        due: task.due || "",
        startDate: task.startDate || "",
        assigned: task.assigned || [],
        assignedIds: task.assignedIds || [],
        status: task.status || ""
      });
      
      setOriginalStatus(task.status || "");
      setStatusChanged(false);

      if (task.assignedIds && Array.isArray(task.assignedIds)) {
        setSelectedAssignees(task.assignedIds);
      } else if (task.assigned && Array.isArray(task.assigned)) {
        const ids = [];
        task.assigned.forEach(name => {
          const member = projectMembers?.find(m => `${m.FirstName} ${m.LastName}` === name);
          if (member) ids.push(member.UserID);
        });
        setSelectedAssignees(ids);
        setEditableTask(prev => ({ ...prev, assignedIds: ids }));
      } else {
        setSelectedAssignees([]);
      }
      
      setAttachments(task.attachments || []);
      setComments(task.comments || []);
    }
  }, [task, projectMembers]);

  useEffect(() => {
    if (show && task && !isArchivedTask && !isPermissionRequest) {
      fetchAttachments();
      fetchComments();
      checkUpdateStatusPermission();
      
      const timer = setTimeout(() => {
        const shouldAutoMove = !isArchived && 
                              isAssigned() && 
                              isInToDo && 
                              !autoMoveCompleted &&
                              currentUserRole !== 'Host' && 
                              currentUserRole !== 'Co-Host';
        
        if (shouldAutoMove) {
          console.log("Auto-moving task to In Progress (member auto-move)...");
          handleAutoMoveToInProgress();
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [show, task?.id, currentUserRole, isArchivedTask, isPermissionRequest]);

  const handleAutoMoveToInProgress = async () => {
    if (currentUserRole === 'Host' || currentUserRole === 'Co-Host') {
      console.log("Skipping auto-move for Host/Co-Host");
      return;
    }
    
    if (autoMoveCompleted) return;
    setAutoMoveCompleted(true);
    
    setLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/general/update_task.php", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          TaskID: parseInt(task.id),
          ProjectID: task.projectId,
          Status: "In Progress",
          UserID: userId
        })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error in auto-move:", parseError);
        throw new Error("Server returned invalid JSON");
      }

      if (result.status === "success") {
        const updatedTask = { ...task, status: "In Progress", completedAt: result.task.completed_at };
        setTask(updatedTask);
        setEditableTask(prev => ({ ...prev, status: "In Progress", completedAt: result.task.completed_at }));
        setOriginalStatus("In Progress");
        setStatusChanged(false);
        if (onSave) {
          onSave(updatedTask);
        }
      } else {
        console.error("Failed to auto-move task:", result.message);
        setAutoMoveCompleted(false);
      }
    } catch (err) {
      console.error("Error auto-moving task:", err);
      setAutoMoveCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  const checkUpdateStatusPermission = async () => {
    if (!task?.id) return;
    
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser?.UserID || storedUser?.user_id || storedUser?.id;
    
    if (!userId) return;
    
    try {
      const response = await fetch(
        `https://accesspmt.bsit3a2025.com/api/activities/get_task_permissions.php?TaskID=${task.id}&UserID=${userId}&ProjectID=${task.projectId}`
      );
      
      const result = await response.json();
      
      if (result.status === "success") {
        setCanUpdateStatus(result.can_update_status === true);
      }
    } catch (err) {
      console.error("Error checking permissions:", err);
    }
  };

  const fetchAttachments = async () => {
    if (!task?.id) return;
    
    setLoadingAttachments(true);
    try {
      const response = await fetch(
        `https://accesspmt.bsit3a2025.com/api/tasks/get_attachments.php?TaskID=${task.id}`
      );
      const result = await response.json();
      
      if (result.status === "success") {
        setAttachments(result.attachments);
      }
    } catch (err) {
      console.error("Error fetching attachments:", err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const fetchComments = async () => {
    if (!task?.id) return;
    
    setLoadingComments(true);
    try {
      const response = await fetch(
        `https://accesspmt.bsit3a2025.com/api/tasks/get_comments.php?TaskID=${task.id}`
      );
      const result = await response.json();
      
      if (result.status === "success") {
        setComments(result.comments);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleRequestPermission = async () => {
    setRequestingPermission(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/activities/request_permission.php", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          TaskID: parseInt(task.id),
          UserID: userId
        })
      });

      const responseText = await response.text();

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error(`Invalid JSON response from server`);
      }

      if (result.status === "success") {
        showCustomAlert("Permission request sent successfully to project hosts!", "success");
        setShowPermissionModal(false);
      } else {
        showCustomAlert(result.message || "Failed to send request", "error");
      }
    } catch (err) {
      console.error("Error requesting permission:", err);
      showCustomAlert(`Error: ${err.message}`, "error");
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleMoveToReview = () => {
    setShowConfirmDialog(true);
  };

  const confirmMoveToReview = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/general/update_task.php", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          TaskID: parseInt(task.id),
          ProjectID: task.projectId,
          Status: "For Review",
          UserID: userId
        })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error("Server returned invalid JSON");
      }

      if (result.status === "success") {
        const updatedTask = {
          ...task,
          status: "For Review",
          completedAt: result.task.completed_at
        };
        
        setTask(updatedTask);
        setEditableTask(prev => ({ 
          ...prev, 
          status: "For Review",
          completedAt: result.task.completed_at 
        }));
        setOriginalStatus("For Review");
        setStatusChanged(false);
        
        if (onSave) {
          onSave(updatedTask);
        }
        showCustomAlert("Task moved to For Review successfully!", "success");
        onClose();
      } else {
        showCustomAlert(result.message || "Failed to move task to review", "error");
      }
    } catch (err) {
      console.error("Error moving task to review:", err);
      showCustomAlert(`Error: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

// In TeacherTaskDetailModal component, add these handler functions after handleReject function (around line 750-760)

const handleApprove = async () => {
  if (!task?.id) return;
  
  setLoading(true);
  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    // Call the API to approve the permission request
    const response = await fetch("https://accesspmt.bsit3a2025.com/api/activities/update_task_assignee_permission.php", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        TaskID: parseInt(task.id),
        UserID: userId,
        TargetUserID: task.requestedUserId || task.assignedIds?.[0], // Use the user who requested
        action: "approve"
      })
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Server returned invalid JSON");
    }

    if (result.status === "success") {
      showCustomAlert("Permission approved! Task has been moved to For Review and user can now update status.", "success");
      // Update the task status to For Review
      const updatedTask = {
        ...task,
        status: "For Review"
      };
      setTask(updatedTask);
      if (onSave) {
        onSave(updatedTask);
      }
      onClose();
    } else {
      showCustomAlert(result.message || "Failed to approve request", "error");
    }
  } catch (err) {
    console.error("Error approving request:", err);
    showCustomAlert(`Error: ${err.message}`, "error");
  } finally {
    setLoading(false);
  }
};

const handleReject = async () => {
  if (!task?.id) return;
  
  setLoading(true);
  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    // Call the API to reject the permission request
    const response = await fetch("https://accesspmt.bsit3a2025.com/api/activities/update_task_assignee_permission.php", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        TaskID: parseInt(task.id),
        UserID: userId,
        TargetUserID: task.requestedUserId || task.assignedIds?.[0], // Use the user who requested
        action: "reject"
      })
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Server returned invalid JSON");
    }

    if (result.status === "success") {
      showCustomAlert("Request rejected.", "info");
      onClose();
    } else {
      showCustomAlert(result.message || "Failed to reject request", "error");
    }
  } catch (err) {
    console.error("Error rejecting request:", err);
    showCustomAlert(`Error: ${err.message}`, "error");
  } finally {
    setLoading(false);
  }
};

  if (!show || !task) return null;

  const handleChange = (field, value) => {
    if (isArchived || isArchivedTask || isPermissionRequest || !canEdit) return;
    setEditableTask(prev => {
      const updated = { ...prev, [field]: value };
      return updated;
    });
  };

  const handleAssigneeToggle = (memberId) => {
    if (isArchived || isArchivedTask || isPermissionRequest || !canEdit) return;
    
    setSelectedAssignees(prev => {
      const newSelected = prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId];
      
      const assignedNames = newSelected.map(id => {
        const member = projectMembers.find(m => m.UserID === id);
        return member ? `${member.FirstName} ${member.LastName}` : '';
      }).filter(name => name);
      
      setEditableTask(prevTask => ({
        ...prevTask,
        assigned: assignedNames,
        assignedIds: newSelected
      }));
      
      return newSelected;
    });
  };

  const handleAddComment = async () => {
    if (isArchived || isArchivedTask || isPermissionRequest) {
      showCustomAlert("Cannot add comments to archived or permission request views", "error");
      return;
    }
    if (!newComment.trim()) return;

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/tasks/add_comment.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TaskID: parseInt(task.id),
          UserID: userId,
          Comment: newComment
        })
      });

      const result = await response.json();

      if (result.status === "success") {
        setComments(prev => [...prev, result.comment]);
        setNewComment("");
      } else {
        showCustomAlert(result.message || "Failed to add comment", "error");
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      showCustomAlert("Network error. Please try again.", "error");
    }
  };

  const handleAttachmentUpload = async (e) => {
    if (isArchived || isArchivedTask || isPermissionRequest) {
      showCustomAlert("Cannot add attachments to archived or permission request views", "error");
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('attachments[]', file);
    });
    
    formData.append('TaskID', task.id);
    
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    formData.append('UserID', userId);

    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/tasks/upload_attachment.php", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (result.status === "success") {
        await fetchAttachments();
      } else {
        showCustomAlert(result.message || "Failed to upload attachments", "error");
      }
    } catch (err) {
      console.error("Error uploading attachments:", err);
      showCustomAlert("Network error. Please try again.", "error");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleRemoveAttachment = async (attachmentId) => {
    if (isArchived || isArchivedTask || isPermissionRequest) return;

    if (!window.confirm("Are you sure you want to remove this attachment?")) return;

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/tasks/delete_attachment.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          AttachmentID: attachmentId,
          UserID: userId
        })
      });

      const result = await response.json();

      if (result.status === "success") {
        setAttachments(prev => prev.filter(a => a.AttachmentID !== attachmentId));
      } else {
        showCustomAlert(result.message || "Failed to delete attachment", "error");
      }
    } catch (err) {
      console.error("Error deleting attachment:", err);
      showCustomAlert("Network error. Please try again.", "error");
    }
  };

  const handleSave = async () => {
    if (isArchived || isArchivedTask || isPermissionRequest) {
      showCustomAlert("Cannot modify archived or permission request views", "error");
      return;
    }
    if (!canEdit) {
      showCustomAlert("Only hosts and co-hosts can edit task details", "error");
      return;
    }
    setLoading(true);
    try {
      const assignedIds = selectedAssignees.length > 0 ? selectedAssignees.join(',') : '';
      
      const newStatus = editableTask.status || task.status;

      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const updateData = {
        TaskID: parseInt(task.id),
        ProjectID: task.projectId,
        TaskName: editableTask.content,
        Description: editableTask.description,
        Status: newStatus,
        DueDate: editableTask.due || null,
        StartDate: editableTask.startDate || null,
        AssignedTo: assignedIds,
        UserID: userId
      };

      console.log("Saving task with data:", updateData);

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/general/update_task.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (result.status === "success") {
        const updatedTask = {
          ...task,
          content: editableTask.content,
          description: editableTask.description,
          due: editableTask.due,
          startDate: editableTask.startDate,
          assigned: editableTask.assigned,
          assignedIds: editableTask.assignedIds,
          status: newStatus,
          completedAt: result.task.completed_at
        };
        
        setTask(updatedTask);
        setOriginalStatus(newStatus);
        setStatusChanged(false);
        
        if (onSave) {
          onSave(updatedTask);
        }
        showCustomAlert("Task updated successfully!", "success");
      } else {
        showCustomAlert(result.message || "Failed to update task", "error");
      }
    } catch (err) {
      console.error("Error updating task:", err);
      showCustomAlert("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadAttachment = (filePath, fileName) => {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusClass = (status) => {
    if (status === "To Do") return "todo";
    if (status === "In Progress") return "inprogress";
    if (status === "For Review") return "review";
    if (status === "Done") return "done";
    return "todo";
  };

  const getInitials = (name) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr || dateStr === "TBD") return "TBD";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric",
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const assigned = Array.isArray(editableTask.assigned) ? editableTask.assigned : [editableTask.assigned].filter(Boolean);
  const availableStatuses = getAvailableStatuses();
  const currentDisplayStatus = editableTask.status || task?.status;
  const hasUnsavedChanges = statusChanged || 
    editableTask.content !== task?.content ||
    editableTask.description !== task?.description ||
    editableTask.due !== task?.due ||
    editableTask.startDate !== task?.startDate ||
    JSON.stringify(editableTask.assignedIds) !== JSON.stringify(task?.assignedIds);

  return (
    <div className="teacher-modal-backdrop" onClick={onClose}>
      {/* Custom Alert Popup */}
      {showAlertPopup && (
        <div className="modern-popup-overlay">
          <div className="modern-popup" style={{ maxWidth: "400px" }}>
            <div className={`modern-popup-header ${alertType}`} style={{
              background: alertType === "success" 
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : alertType === "error"
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : alertType === "warning"
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            }}>
              <h3>
                {alertType === "success" && "✓ Success"}
                {alertType === "error" && "✗ Error"}
                {alertType === "warning" && "⚠ Warning"}
                {alertType === "info" && "ℹ Information"}
              </h3>
            </div>
            <div className="modern-popup-content" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1rem", margin: "20px 0", color: "#374151" }}>
                {alertMessage}
              </p>
            </div>
            <div className="modern-popup-footer centered">
              <button 
                className="modern-btn modern-btn-primary" 
                onClick={() => setShowAlertPopup(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        className="teacher-overview-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="teacher-overview-modal-header">
          <div className="teacher-overview-header-content">
            <span className="teacher-overview-header-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
              {isPermissionRequest ? "Permission Request" : isArchivedTask ? "Archived Task" : "User Story Overview"}
            </span>
            <h2 className="teacher-overview-header-title">{task.content}</h2>
            <p className="teacher-overview-header-subtitle">
              {isPermissionRequest 
                ? "Review permission request and take action"
                : isArchivedTask 
                ? "This task is archived. You can restore it if needed."
                : "View task details, materials, and activity"}
              {!isReadOnly && !canEdit && <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>(View Only)</span>}
              {hasUnsavedChanges && !isReadOnly && canEdit && (
                <span style={{ color: '#ff6a00', marginLeft: '12px', fontSize: '11px' }}>• Unsaved changes</span>
              )}
            </p>
          </div>
          <button className="teacher-overview-close-btn" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Auto-move in progress indicator - only for non-archived tasks */}
        {loading && isAssigned() && isInToDo && !isArchivedTask && !isPermissionRequest && (
          <div style={{
            margin: '0 32px 16px',
            padding: '12px 16px',
            background: '#e8f8fb',
            border: '1px solid #20c5e0',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#0a5d7e',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div className="loading-indicator" style={{
              width: '20px',
              height: '20px',
              border: '3px solid rgba(32,197,224,0.3)',
              borderTopColor: '#20c5e0',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span>Moving task to In Progress...</span>
          </div>
        )}

        {/* Permission Request Info Banner */}
        {isPermissionRequest && (
          <div style={{
            margin: '0 32px 16px',
            padding: '12px 16px',
            background: '#fff3e6',
            border: '1px solid #fd8d32',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>This user is requesting permission to move this task to For Review.</span>
          </div>
        )}

        {/* Info Cards Row */}
        <div className="teacher-overview-info-row">
          <div className="teacher-overview-info-card">
            <div className="teacher-overview-info-icon project">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="teacher-overview-info-label">Project</p>
              <p className="teacher-overview-info-value">{task.projectName || "SAMPLE PROJECT 1"}</p>
            </div>
          </div>
          <div className="teacher-overview-info-card">
            <div className="teacher-overview-info-icon status">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <p className="teacher-overview-info-label">Status</p>
              {!isReadOnly && canChangeStatus ? (
                <div style={{ position: 'relative' }} ref={setStatusDropdownRef}>
                  <button
                    className={`teacher-overview-status-badge ${getStatusClass(currentDisplayStatus)}`}
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    style={{
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    disabled={updatingStatus}
                  >
                    <span className="teacher-status-dot" />
                    {currentDisplayStatus}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showStatusDropdown && (
                    <div className="status-dropdown" style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '8px',
                      background: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      minWidth: '140px',
                      zIndex: 100,
                      overflow: 'hidden'
                    }}>
                      {availableStatuses.map(status => (
                        <button
                          key={status.value}
                          className="status-dropdown-item"
                          onClick={() => handleStatusSelect(status.value)}
                          disabled={updatingStatus}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '10px 16px',
                            border: 'none',
                            background: 'white',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            fontSize: '13px',
                            fontWeight: 500
                          }}
                          onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                          onMouseLeave={e => e.target.style.background = 'white'}
                        >
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: status.color
                          }} />
                          {status.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className={`teacher-overview-status-badge ${getStatusClass(currentDisplayStatus)}`}>
                  <span className="teacher-status-dot" />
                  {currentDisplayStatus}
                </span>
              )}
            </div>
          </div>
          <div className="teacher-overview-info-card">
            <div className="teacher-overview-info-icon due">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <p className="teacher-overview-info-label">Due Date</p>
              <p className="teacher-overview-info-value">{formatDateTime(editableTask.due) || "—"}</p>
            </div>
          </div>
        </div>

        {/* Start Date Row */}
        {(editableTask.startDate && editableTask.startDate !== "TBD") && (
          <div className="teacher-overview-info-row" style={{ marginTop: '-8px' }}>
            <div className="teacher-overview-info-card">
              <div className="teacher-overview-info-icon" style={{ background: '#eef0f4', color: '#555' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <p className="teacher-overview-info-label">Start Date</p>
                <p className="teacher-overview-info-value">{formatDateTime(editableTask.startDate)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Assigned Bar */}
        <div className="teacher-overview-assigned-bar">
          <div className="teacher-overview-assigned-left">
            <span className="teacher-overview-assigned-label">Assigned to</span>
            <div className="teacher-overview-avatars">
              {assigned.map((name, i) => (
                <div key={name} className={`teacher-overview-avatar av-${(i % 4) + 1}`} title={name}>
                  {getInitials(name)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="teacher-overview-tabs">
          {[
            { key: "overview", label: "Task Overview" },
            { key: "materials", label: `Materials (${attachments.length})` },
            { key: "comments", label: `Comments (${comments.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`teacher-overview-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="teacher-overview-tab-body">
          {activeTab === "overview" && (
            <div>
              <p className="teacher-overview-section-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="17" y1="10" x2="3" y2="10" />
                  <line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="21" y1="14" x2="3" y2="14" />
                  <line x1="17" y1="18" x2="3" y2="18" />
                </svg>
                Task Description
              </p>
              {!isReadOnly && canEdit ? (
                <textarea
                  className="teacher-overview-description-box"
                  value={editableTask.description || ""}
                  onChange={e => handleChange("description", e.target.value)}
                  style={{ width: '100%', minHeight: '120px', padding: '12px', fontFamily: 'inherit' }}
                />
              ) : (
                <div className="teacher-overview-description-box">
                  {editableTask.description || "No description provided"}
                </div>
              )}

              {!isReadOnly && canEdit && (
                <div style={{ marginTop: '24px', borderTop: '1px solid #eef0f4', paddingTop: '20px' }}>
                  <p className="teacher-overview-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                    Edit Task
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label className="teacher-modal-label" style={{ display: 'block', marginBottom: '6px' }}>Subject</label>
                      <input
                        type="text"
                        className="teacher-modal-input"
                        value={editableTask.content || ""}
                        onChange={e => handleChange("content", e.target.value)}
                        style={{ width: '100%', padding: '10px' }}
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <label className="teacher-modal-label" style={{ display: 'block', marginBottom: '6px' }}>Due Date & Time</label>
                      <input
                        type="datetime-local"
                        className="teacher-modal-input"
                        value={formatDateForInput(editableTask.due)}
                        onChange={e => handleChange("due", e.target.value)}
                        style={{ width: '100%', padding: '10px' }}
                        disabled={isReadOnly}
                      />
                      <small style={{ color: '#888', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                        Leave empty if no due date
                      </small>
                    </div>

                    <div>
                      <label className="teacher-modal-label" style={{ display: 'block', marginBottom: '6px' }}>Start Date & Time</label>
                      <input
                        type="datetime-local"
                        className="teacher-modal-input"
                        value={formatDateForInput(editableTask.startDate)}
                        onChange={e => handleChange("startDate", e.target.value)}
                        style={{ width: '100%', padding: '10px' }}
                        disabled={isReadOnly}
                      />
                      <small style={{ color: '#888', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                        Leave empty if no start date
                      </small>
                    </div>

                    <div>
                      <label className="teacher-modal-label" style={{ display: 'block', marginBottom: '10px' }}>Assign Members</label>
                      
                      <div style={{ position: 'relative', marginBottom: '10px' }}>
                        <svg 
                          width="14" 
                          height="14" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="#999"
                          style={{ 
                            position: 'absolute', 
                            left: '10px', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none'
                          }}
                        >
                          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <input
                          type="text"
                          placeholder="Search members by name or email..."
                          value={assigneeSearchTerm}
                          onChange={(e) => setAssigneeSearchTerm(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 10px 10px 34px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                          disabled={isReadOnly}
                        />
                        {assigneeSearchTerm && !isReadOnly && (
                          <button
                            onClick={() => setAssigneeSearchTerm("")}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#999',
                              cursor: 'pointer',
                              fontSize: '16px',
                              padding: '4px 8px'
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <div style={{ 
                        maxHeight: '200px', 
                        overflowY: 'auto', 
                        border: '1px solid #eef0f4', 
                        borderRadius: '8px',
                        padding: '8px'
                      }}>
                        {filteredProjectMembers.length > 0 ? (
                          filteredProjectMembers.map((member, i) => {
                            const isSelected = selectedAssignees.includes(member.UserID);
                            return (
                              <div 
                                key={member.UserID}
                                onClick={() => !isReadOnly && handleAssigneeToggle(member.UserID)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '10px 12px',
                                  cursor: isReadOnly ? 'default' : 'pointer',
                                  borderRadius: '6px',
                                  backgroundColor: isSelected ? '#e8f8fb' : 'transparent',
                                  border: isSelected ? '1px solid #20c5e0' : '1px solid transparent',
                                  marginBottom: '4px',
                                  transition: 'all 0.2s',
                                  opacity: isReadOnly ? 0.7 : 1
                                }}
                                onMouseEnter={e => !isReadOnly && !isSelected && (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                                onMouseLeave={e => !isReadOnly && !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <div className={`teacher-create-sidebar-member-avatar av-${(i % 4) + 1}`}>
                                  {getInitials(`${member.FirstName} ${member.LastName}`)}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                                    {member.FirstName} {member.LastName}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#888' }}>{member.Email}</div>
                                </div>
                                <div>
                                  {isSelected ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#20c5e0" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                                      <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>
                            No members found matching "{assigneeSearchTerm}"
                          </div>
                        )}
                      </div>
                      {!isReadOnly && (
                        <small style={{ color: '#888', fontSize: '11px', marginTop: '6px', display: 'block' }}>
                          Click on members to assign/unassign
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "materials" && (
            <div>
              <p className="teacher-overview-section-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                Attachments
              </p>
              
              {!isReadOnly && canEdit && (
                <div className="teacher-overview-dropzone" style={{ cursor: 'pointer' }} onClick={() => document.getElementById('teacher-file-upload').click()}>
                  <div className="teacher-overview-dropzone-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="teacher-overview-dropzone-text">
                    {uploading ? "Uploading..." : "Drop files or click to browse"}
                  </p>
                  <input 
                    id="teacher-file-upload"
                    type="file" 
                    multiple 
                    hidden 
                    onChange={handleAttachmentUpload}
                    disabled={uploading || isReadOnly}
                  />
                </div>
              )}

              {!isReadOnly && !canEdit && (
                <div className="teacher-overview-dropzone" style={{ opacity: 0.7 }}>
                  <div className="teacher-overview-dropzone-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <p className="teacher-overview-dropzone-text">View-only mode - Only hosts can upload files</p>
                </div>
              )}

              {loadingAttachments ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Loading attachments...</p>
              ) : attachments.length > 0 ? (
                <div style={{ marginTop: '16px' }}>
                  <p className="teacher-overview-section-label" style={{ marginTop: 16 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                    Available Files
                  </p>
                  {attachments.map((att) => (
                    <div key={att.AttachmentID} className="teacher-overview-file-item">
                      <div className="teacher-overview-file-left">
                        <div className="teacher-overview-file-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                            <polyline points="13 2 13 9 20 9" />
                          </svg>
                        </div>
                        <span className="teacher-overview-file-name">{att.FileName}</span>
                        <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>{att.FormattedSize}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="teacher-overview-file-badge download"
                          onClick={() => downloadAttachment(att.FilePath, att.FileName)}
                        >
                          Download
                        </button>
                        {!isReadOnly && canEdit && (
                          <button
                            className="teacher-overview-file-badge delete"
                            onClick={() => handleRemoveAttachment(att.AttachmentID)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="teacher-overview-empty-state" style={{ marginTop: 16 }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                  </svg>
                  <p style={{ margin: 0 }}>No attachments available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div>
              <p className="teacher-overview-section-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Discussion
              </p>
              
              <div className="teacher-overview-comments-list">
                {loadingComments ? (
                  <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Loading comments...</p>
                ) : comments.length > 0 ? (
                  comments.map((c) => (
                    <div key={c.CommentID} className="teacher-overview-comment-card">
                      <div className="teacher-overview-comment-header">
                        <div className="teacher-overview-comment-user">
                          <div className="teacher-overview-comment-avatar">
                            {getInitials(c.UserName)}
                          </div>
                          <span className="teacher-overview-comment-name">{c.UserName}</span>
                        </div>
                        <span className="teacher-overview-comment-time">{c.TimeAgo}</span>
                      </div>
                      <p className="teacher-overview-comment-text">{c.Comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="teacher-overview-empty-state">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <p style={{ margin: "12px 0 0" }}>No comments yet</p>
                  </div>
                )}
              </div>

              {!isReadOnly && (
                <div className="teacher-overview-comment-input-group">
                  <p className="teacher-overview-section-label">Add a comment</p>
                  <textarea
                    className="teacher-overview-comment-textarea"
                    placeholder="Write your comment here..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button 
                      className="teacher-overview-comment-submit"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      Post Comment
                    </button>
                  </div>
                </div>
              )}

              {isReadOnly && (
                <div className="teacher-overview-comment-hint">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Comments are disabled in archived projects and permission request views
                </div>
              )}
            </div>
          )}
        </div>

{/* Footer with actions */}
<div className="teacher-overview-modal-footer">
  <div className="teacher-footer-left">
    {!isReadOnly && 
    canMoveToReview && 
    currentUserRole !== 'Host' && 
    currentUserRole !== 'Co-Host' && (
      <button 
        className="teacher-footer-move-review-btn active"
        onClick={handleMoveToReview}
        disabled={loading}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {loading ? "Moving..." : "Request Review"}
      </button>
    )}

    {!isReadOnly && 
    !canEdit && 
    !canUpdateStatus && 
    task.status === 'In Progress' && 
    currentUserRole !== 'Host' && 
    currentUserRole !== 'Co-Host' && (
      <button
        className="teacher-footer-permission-btn"
        onClick={() => setShowPermissionModal(true)}
        disabled={requestingPermission}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        Request Permission
      </button>
    )}

    {/* Archive button - only for non-archived tasks, not for archived task view */}
    {!isArchived && !isArchivedTask && !isPermissionRequest && canArchive && (
      <button 
        className="teacher-footer-archive-btn"
        onClick={() => {
          onClose();
          setTimeout(() => {
            onArchiveTask(task.id, task.content);
          }, 100);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 8v13H3V8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M23 3H1v5h22V3z" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="10" y1="12" x2="14" y2="12" strokeLinecap="round"/>
        </svg>
        Archive
      </button>
    )}

    {/* Restore button - only for archived task view and only for Host/Co-Host */}
    {isArchivedTask && onRestoreTask && (currentUserRole === 'Host' || currentUserRole === 'Co-Host') && (
      <button 
        className="teacher-footer-move-review-btn active"
        style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
        onClick={() => onRestoreTask(task.id)}
        disabled={loading}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {loading ? "Restoring..." : "Restore Task"}
      </button>
    )}

    {/* Approve/Reject buttons for permission requests */}
    {isPermissionRequest && (
      <div className="permission-actions-container" style={{ display: 'flex', gap: '12px' }}>
        <button 
          className="permission-approve-btn"
          onClick={handleApprove}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            background: loading ? '#a0a0a0' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            opacity: loading ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
            }
          }}
        >
          {loading ? (
            <>
              <div className="loading-spinner-small" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div>
              Processing...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Approve Request
            </>
          )}
        </button>
        <button 
          className="permission-reject-btn"
          onClick={handleReject}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            background: loading ? '#a0a0a0' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
            opacity: loading ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
            }
          }}
        >
          {loading ? (
            <>
              <div className="loading-spinner-small" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div>
              Processing...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Reject Request
            </>
          )}
        </button>
      </div>
    )}
  </div>

  <div className="teacher-footer-right">
    {!isReadOnly && canEdit && (
      <button 
        className={`teacher-overview-save-footer-btn ${hasUnsavedChanges ? 'unsaved' : ''}`}
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? "Saving..." : (hasUnsavedChanges ? "Save Changes*" : "Save Changes")}
      </button>
    )}
    
    <button className="teacher-overview-close-footer-btn" onClick={onClose}>
      Close
    </button>
  </div>
</div>

        {/* Confirmation Dialog for Move to Review */}
        {showConfirmDialog && (
          <div className="teacher-confirm-dialog-overlay" onClick={() => setShowConfirmDialog(false)}>
            <div className="teacher-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="teacher-confirm-dialog-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e15050" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="teacher-confirm-dialog-title">Move to For Review?</h3>
              <p className="teacher-confirm-dialog-message">
                Are you sure you want to move "{editableTask.content}" to For Review? 
                This will notify the instructors that your task is ready for review.
              </p>
              <div className="teacher-confirm-dialog-actions">
                <button 
                  className="teacher-confirm-dialog-cancel"
                  onClick={() => setShowConfirmDialog(false)}
                >
                  Cancel
                </button>
                <button 
                  className="teacher-confirm-dialog-confirm"
                  onClick={confirmMoveToReview}
                >
                  Yes, Move to Review
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permission Request Modal */}
        {showPermissionModal && (
          <div className="teacher-modal-backdrop" onClick={() => setShowPermissionModal(false)}>
            <div className="tpd-invite-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
              <div className="tpd-invite-modal-header">
                <h3>Request Permission to Update Status</h3>
                <button className="tpd-close-btn" onClick={() => setShowPermissionModal(false)}>&times;</button>
              </div>
              <div className="tpd-invite-modal-body">
                <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
                  You are requesting permission to move this task from <strong>In Progress</strong> to <strong>For Review</strong>.
                </p>
                <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
                  Once approved, you'll be able to update the task status yourself.
                </p>
                {requestingPermission && (
                  <p style={{ textAlign: 'center', color: '#888', fontSize: '13px' }}>Sending request...</p>
                )}
              </div>
              <div className="tpd-invite-modal-footer">
                <button 
                  className="tpd-btn-outline" 
                  onClick={() => setShowPermissionModal(false)}
                  disabled={requestingPermission}
                >
                  Cancel
                </button>
                <button 
                  className="tpd-btn-primary" 
                  onClick={handleRequestPermission}
                  disabled={requestingPermission}
                >
                  {requestingPermission ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Overview Page Component
function OverviewPage({ project, teacherTasks, totalTasks, completed, inReview, overdue, inProgress, onAddTask, setTeacherActivePage, isArchived }) {
  const allTasks = Object.values(teacherTasks).flat();
  const progressPercent = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
  const [teacherName, setTeacherName] = useState("Teacher");

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      
      if (!storedUser) {
        return;
      }

      try {
        const userResponse = await fetch(
          "https://accesspmt.bsit3a2025.com/api/general/fetch_user.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ UserID: storedUser.user_id || storedUser.UserID || storedUser.id }),
          }
        );

        const userResult = await userResponse.json();

        if (userResult.status === "success") {
          setTeacherName(userResult.user.FullName || "JOHN JUAN DOE");
        } else {
          const fullName = storedUser.FirstName && storedUser.LastName 
            ? `${storedUser.FirstName} ${storedUser.LastName}`.toUpperCase()
            : storedUser.Name?.toUpperCase() || "JOHN JUAN DOE";
          
          setTeacherName(fullName);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
          const fullName = storedUser.FirstName && storedUser.LastName 
            ? `${storedUser.FirstName} ${storedUser.LastName}`.toUpperCase()
            : storedUser.Name?.toUpperCase() || "JOHN JUAN DOE";
          setTeacherName(fullName);
        }
      }
    };

    fetchUserData();
  }, []);

  const todoCount = teacherTasks.todo?.length || 0;
  const inProgressCount = teacherTasks.inprogress?.length || 0;
  const reviewCount = teacherTasks.review?.length || 0;
  const doneCount = teacherTasks.done?.length || 0;
  const recentTasks = allTasks.slice(0, 4);

  const calculateStrokeDasharray = (count, total, offset) => {
    if (total === 0) return '0 314';
    const percentage = count / total;
    const dashLength = percentage * 314;
    return `${dashLength} ${314 - dashLength}`;
  };

  const inProgressOffset = (todoCount / totalTasks) * 314;
  const reviewOffset = ((todoCount + inProgressCount) / totalTasks) * 314;
  const doneOffset = ((todoCount + inProgressCount + reviewCount) / totalTasks) * 314;

  const handleViewAllTasks = () => {
    setTeacherActivePage("Status Board");
  };

  return (
    <div className="tpd-overview">
      <div className="tpd-welcome-banner">
        <div className="tpd-welcome-left">
          <span className="tpd-welcome-badge">Project Dashboard {isArchived && "(Archived - Read Only)"}</span>
          <h2 className="tpd-welcome-title">Welcome back, {teacherName}</h2>
          <p className="tpd-welcome-subtitle">
            {isArchived 
              ? "This project is archived. You can view but not modify any content." 
              : "Here is what is happening with your project today."}
          </p>
        </div>
      </div>

      <div className="tpd-stats-row">
        <div className="tpd-stat-card tpd-stat-total">
          <div className="tpd-stat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">Total Tasks</span>
            <span className="tpd-stat-number">{totalTasks}</span>
          </div>
          <div className="tpd-stat-badge neutral">{totalTasks} total</div>
        </div>

        <div className="tpd-stat-card tpd-stat-progress">
          <div className="tpd-stat-icon progress">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">In Progress</span>
            <span className="tpd-stat-number">{inProgress}</span>
          </div>
          <div className="tpd-stat-badge orange">{inProgress} active</div>
        </div>

        <div className="tpd-stat-card tpd-stat-done">
          <div className="tpd-stat-icon done">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">Completed</span>
            <span className="tpd-stat-number">{completed}</span>
          </div>
          <div className="tpd-stat-badge green">{progressPercent}%</div>
        </div>

        <div className="tpd-stat-card tpd-stat-overdue">
          <div className="tpd-stat-icon overdue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">Overdue</span>
            <span className="tpd-stat-number">{overdue}</span>
          </div>
          <div className="tpd-stat-badge red">{overdue > 0 ? "Warning!" : "All clear"}</div>
        </div>
      </div>

      <div className="tpd-overview-grid">
        <div className="tpd-progress-card">
          <h3 className="tpd-card-title">Project Progress</h3>
          <div className="tpd-progress-ring-wrapper">
            <div className="tpd-progress-ring">
              <svg viewBox="0 0 120 120" width="120" height="120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#eee" strokeWidth="10" />
                
                {todoCount > 0 && (
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="#20c5e0" 
                    strokeWidth="10" 
                    strokeLinecap="round"
                    strokeDasharray={calculateStrokeDasharray(todoCount, totalTasks, 0)}
                    strokeDashoffset="0"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                )}
                
                {inProgressCount > 0 && (
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="#fd8d32" 
                    strokeWidth="10" 
                    strokeLinecap="round"
                    strokeDasharray={calculateStrokeDasharray(inProgressCount, totalTasks, 0)}
                    strokeDashoffset={-inProgressOffset}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                )}
                
                {reviewCount > 0 && (
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="#e15050" 
                    strokeWidth="10" 
                    strokeLinecap="round"
                    strokeDasharray={calculateStrokeDasharray(reviewCount, totalTasks, 0)}
                    strokeDashoffset={-reviewOffset}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                )}
                
                {doneCount > 0 && (
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="#69d186" 
                    strokeWidth="10" 
                    strokeLinecap="round"
                    strokeDasharray={calculateStrokeDasharray(doneCount, totalTasks, 0)}
                    strokeDashoffset={-doneOffset}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                )}
              </svg>
              <span className="tpd-ring-text">{progressPercent}%</span>
            </div>
            <div className="tpd-progress-breakdown">
              <div className="tpd-breakdown-row">
                <span className="tpd-breakdown-dot" style={{ background: "#20c5e0" }} />
                <span className="tpd-breakdown-label">To Do</span>
                <span className="tpd-breakdown-count">{todoCount}</span>
              </div>
              <div className="tpd-breakdown-row">
                <span className="tpd-breakdown-dot" style={{ background: "#fd8d32" }} />
                <span className="tpd-breakdown-label">In Progress</span>
                <span className="tpd-breakdown-count">{inProgressCount}</span>
              </div>
              <div className="tpd-breakdown-row">
                <span className="tpd-breakdown-dot" style={{ background: "#e15050" }} />
                <span className="tpd-breakdown-label">For Review</span>
                <span className="tpd-breakdown-count">{reviewCount}</span>
              </div>
              <div className="tpd-breakdown-row">
                <span className="tpd-breakdown-dot" style={{ background: "#69d186" }} />
                <span className="tpd-breakdown-label">Done</span>
                <span className="tpd-breakdown-count">{doneCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="tpd-team-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="tpd-card-title" style={{ margin: 0 }}>All Tasks Overview</h3>
            {allTasks.length > 4 && (
              <button 
                className="modern-view-link" 
                onClick={handleViewAllTasks}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff6a00',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                View All Tasks <span className="arrow" style={{ transition: 'transform 0.3s ease', display: 'inline-block' }}>→</span>
              </button>
            )}
          </div>
          <div className="tpd-table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="tpd-table">
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                <tr>
                  <th>Task</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.length > 0 ? (
                  recentTasks.map(task => (
                    <tr key={task.id} className={isOverdue(task.due, task.status, task.completedAt) ? "tpd-row-overdue" : ""}>
                      <td className="tpd-task-name">{task.content}</td>
                      <td>
                        <div className="tpd-avatar-stack">
                          {(Array.isArray(task.assigned) ? task.assigned : [task.assigned]).filter(Boolean).map(name => (
                            <span className="tpd-mini-avatar" key={name} title={name}>{getInitials(name)}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`tpd-status-pill ${task.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className={isOverdue(task.due, task.status, task.completedAt) ? "tpd-overdue-text" : ""}>
                        {formatDate(task.due)}
                        {isOverdue(task.due, task.status, task.completedAt) && task.status === "Done" && (
                          <span style={{ marginLeft: '8px', color: '#fff126', fontWeight: 600 }}>(Late)</span>
                        )}
                        {isOverdue(task.due, task.status, task.completedAt) && task.status !== "Done" && (
                          <span style={{ marginLeft: '8px', color: '#e15050', fontWeight: 600 }}>(Overdue)</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                      No tasks available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Page Component (Updated with custom modals)
function SettingsPage({ project, settings, setSettings, projectId, setTeacherActivePage, isArchived }) {
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const [activeMemberTab, setActiveMemberTab] = useState("leads");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Team Member");
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [openRoleDropdown, setOpenRoleDropdown] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [unarchiveLoading, setUnarchiveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  
  // Custom Alert Popup
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");
  
  // Remove Member Modal
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [selectedMemberToRemove, setSelectedMemberToRemove] = useState(null);

  const showCustomAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertPopup(true);
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
      setCurrentUserId(userId);
    }
  }, []);

  useEffect(() => {
    if (project) {
      setSettings({
        projectName: project.ProjectName || "",
        projectDescription: project.FullDescription || project.Description || "",
        projectCode: project.Code || ""
      });
    }
  }, [project, setSettings]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!projectId) return;
      
      setLoadingMembers(true);
      setLoadingRequests(true);
      
      try {
        const response = await fetch(
          `https://accesspmt.bsit3a2025.com/api/general/get_project_members.php?ProjectID=${projectId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        
        if (result.status === "success") {
          const approvedMembers = result.members.filter(m => m.ProjectRole !== 'Pending');
          const pendingRequests = result.members.filter(m => m.ProjectRole === 'Pending');
          
          setProjectMembers(approvedMembers);
          setJoinRequests(pendingRequests.map(request => ({
            id: `req-${request.UserID}`,
            name: `${request.FirstName} ${request.LastName}`,
            email: request.Email,
            requestedRole: "Team Member",
            reason: "Requested to join the project",
            requestedAt: request.JoinDate || new Date().toISOString(),
            status: "pending"
          })));
          
          const currentUser = approvedMembers.find(m => m.UserID === currentUserId);
          if (currentUser) {
            setIsHost(currentUser.ProjectRole === 'Host');
            setIsCoHost(currentUser.ProjectRole === 'Co-Host');
            setIsMember(currentUser.ProjectRole === 'Member');
          }
        }
      } catch (err) {
        console.error("Error fetching project members:", err);
      } finally {
        setLoadingMembers(false);
        setLoadingRequests(false);
      }
    };

    fetchMembers();
  }, [projectId, currentUserId]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(settings.projectCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveChanges = async () => {
    if (isArchived) {
      showCustomAlert("Cannot modify archived project", "error");
      return;
    }
    if (!isHost) {
      showCustomAlert("Only project hosts can modify project settings", "error");
      return;
    }
    if (!projectId) {
      setSaveError("Project ID is missing");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      setSaveError("User not logged in");
      return;
    }

    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    if (!userId) {
      setSaveError("User ID not found");
      return;
    }

    if (settings.projectName === (project.ProjectName || "") && 
        settings.projectDescription === (project.FullDescription || project.Description || "")) {
      showCustomAlert("No changes to save", "warning");
      return;
    }

    setIsLoading(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const updateData = {
        ProjectID: projectId,
        UserID: userId
      };

      if (settings.projectName !== (project.ProjectName || "")) {
        updateData.ProjectName = settings.projectName;
      }

      if (settings.projectDescription !== (project.FullDescription || project.Description || "")) {
        updateData.Description = settings.projectDescription;
      }

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/update_project.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(updateData),
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error("Server returned invalid JSON. Check server logs.");
      }

      if (result.status === "success") {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        
        if (result.project) {
          project.ProjectName = result.project.ProjectName;
          project.FullDescription = result.project.Description;
        }
        showCustomAlert("Project updated successfully!", "success");
      } else {
        setSaveError(result.message || "Failed to update project");
        showCustomAlert(result.message || "Failed to update project", "error");
      }
    } catch (err) {
      console.error("Error updating project:", err);
      setSaveError(err.message || "Network error. Please try again.");
      showCustomAlert(err.message || "Network error. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (isArchived) {
      showCustomAlert("Cannot modify roles in archived project", "error");
      return;
    }
    if (!isHost) {
      showCustomAlert("Only project hosts can change member roles", "error");
      return;
    }

    setUpdatingRole(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/update_member_role.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId,
          TargetUserID: memberId,
          NewRole: newRole
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        setProjectMembers(prev => 
          prev.map(member => 
            member.UserID === memberId 
              ? { ...member, ProjectRole: newRole }
              : member
          )
        );
        setOpenRoleDropdown(null);
        showCustomAlert(`Member role updated to ${newRole}`, "success");
      } else {
        showCustomAlert(result.message || "Failed to update member role", "error");
      }
    } catch (err) {
      console.error("Error updating member role:", err);
      showCustomAlert("Network error. Please try again.", "error");
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleRemoveMemberConfirm = async (memberId) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/remove_member.php", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId,
          TargetUserID: memberId
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        setProjectMembers(prev => prev.filter(member => member.UserID !== memberId));
        showCustomAlert("Member removed successfully", "success");
      } else {
        showCustomAlert(result.message || "Failed to remove member", "error");
      }
    } catch (err) {
      console.error("Error removing member:", err);
      showCustomAlert("Network error. Please try again.", "error");
    }
  };

  const handleRemoveMember = (memberId, memberName) => {
    if (isArchived) {
      showCustomAlert("Cannot remove members from archived project", "error");
      return;
    }
    if (!isHost) {
      showCustomAlert("Only project hosts can remove members", "error");
      return;
    }
    setSelectedMemberToRemove({ id: memberId, name: memberName });
    setShowRemoveMemberModal(true);
  };

  const handleInviteMember = async () => {
    if (isArchived) {
      showCustomAlert("Cannot invite members to archived project", "error");
      return;
    }
    if (!isHost && !isCoHost) {
      showCustomAlert("Only project hosts and co-hosts can invite members", "error");
      return;
    }
    if (!inviteEmail.trim()) {
      showCustomAlert("Please enter an email address", "warning");
      return;
    }

    if (!inviteRole) {
      showCustomAlert("Please select a role", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const userResponse = await fetch("https://accesspmt.bsit3a2025.com/api/general/get_user_by_email.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Email: inviteEmail
        }),
      });

      const userResult = await userResponse.json();

      if (userResult.status !== "success" || !userResult.user) {
        showCustomAlert("User not found with this email address", "error");
        setIsLoading(false);
        return;
      }

      const invitedUserId = userResult.user.UserID;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/invite_member.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId,
          InvitedUserID: invitedUserId,
          Role: inviteRole === "Project Co-Host" ? "Co-Host" : "Member"
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        showCustomAlert("Member invited successfully!", "success");
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteRole("Team Member");
        
        const membersResponse = await fetch(
          `https://accesspmt.bsit3a2025.com/api/general/get_project_members.php?ProjectID=${projectId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        const membersResult = await membersResponse.json();
        if (membersResult.status === "success") {
          const approvedMembers = membersResult.members.filter(m => m.ProjectRole !== 'Pending');
          const pendingRequests = membersResult.members.filter(m => m.ProjectRole === 'Pending');
          
          setProjectMembers(approvedMembers);
          setJoinRequests(pendingRequests.map(request => ({
            id: `req-${request.UserID}`,
            name: `${request.FirstName} ${request.LastName}`,
            email: request.Email,
            requestedRole: "Team Member",
            reason: "Requested to join the project",
            requestedAt: request.JoinDate || new Date().toISOString(),
            status: "pending"
          })));
        }
      } else {
        showCustomAlert(result.message || "Failed to send invitation", "error");
      }
    } catch (err) {
      console.error("Error inviting member:", err);
      showCustomAlert("Network error. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId, userId) => {
    if (isArchived) {
      showCustomAlert("Cannot approve requests in archived project", "error");
      return;
    }
    if (!isHost) {
      showCustomAlert("Only project hosts can approve join requests", "error");
      return;
    }
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const currentUserId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/update_member_role.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: currentUserId,
          TargetUserID: userId,
          NewRole: "Member"
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        const approvedRequest = joinRequests.find(req => req.id === requestId);
        setJoinRequests(prev => prev.filter(req => req.id !== requestId));
        
        if (approvedRequest) {
          const newMember = {
            UserID: userId,
            FirstName: approvedRequest.name.split(' ')[0],
            LastName: approvedRequest.name.split(' ').slice(1).join(' '),
            Email: approvedRequest.email,
            ProjectRole: "Member"
          };
          setProjectMembers(prev => [...prev, newMember]);
        }
        
        showCustomAlert("Request approved! User has been added to the project.", "success");
      } else {
        showCustomAlert(result.message || "Failed to approve request", "error");
      }
    } catch (err) {
      console.error("Error approving request:", err);
      showCustomAlert("Network error. Please try again.", "error");
    }
  };

  const handleRejectRequest = async (requestId, userId) => {
    if (isArchived) {
      showCustomAlert("Cannot reject requests in archived project", "error");
      return;
    }
    if (!isHost) {
      showCustomAlert("Only project hosts can reject join requests", "error");
      return;
    }
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const currentUserId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/remove_member.php", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: currentUserId,
          TargetUserID: userId
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        setJoinRequests(prev => prev.filter(req => req.id !== requestId));
        showCustomAlert("Request rejected.", "info");
      } else {
        showCustomAlert(result.message || "Failed to reject request", "error");
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
      showCustomAlert("Network error. Please try again.", "error");
    }
  };

  const handleUnarchiveProject = async () => {
    if (!isHost) {
      showCustomAlert("Only project hosts can unarchive the project", "error");
      return;
    }

    if (!projectId) {
      showCustomAlert("Project ID is missing", "error");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      showCustomAlert("User not logged in", "error");
      return;
    }

    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    if (!userId) {
      showCustomAlert("User ID not found", "error");
      return;
    }

    setUnarchiveLoading(true);
    setArchiveError("");

    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/restore_project.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        showCustomAlert("Project unarchived successfully!", "success");
        setShowUnarchiveModal(false);
        window.location.reload();
      } else {
        setArchiveError(result.message || "Failed to unarchive project");
        showCustomAlert(result.message || "Failed to unarchive project", "error");
      }
    } catch (err) {
      console.error("Error unarchiving project:", err);
      setArchiveError("Network error. Please try again.");
      showCustomAlert("Network error. Please try again.", "error");
    } finally {
      setUnarchiveLoading(false);
    }
  };

  const handleArchiveProject = async () => {
    if (isArchived) return;
    if (!isHost) {
      showCustomAlert("Only project hosts can archive the project", "error");
      return;
    }

    if (!projectId) {
      showCustomAlert("Project ID is missing", "error");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      showCustomAlert("User not logged in", "error");
      return;
    }

    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    if (!userId) {
      showCustomAlert("User ID not found", "error");
      return;
    }

    setArchiveLoading(true);
    setArchiveError("");

    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/archive_project.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        showCustomAlert("Project archived successfully!", "success");
        setShowArchiveModal(false);
        if (setTeacherActivePage) {
          setTeacherActivePage("projects");
        }
      } else {
        setArchiveError(result.message || "Failed to archive project");
        showCustomAlert(result.message || "Failed to archive project", "error");
      }
    } catch (err) {
      console.error("Error archiving project:", err);
      setArchiveError("Network error. Please try again.");
      showCustomAlert("Network error. Please try again.", "error");
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (isArchived) return;
    if (!isHost) {
      showCustomAlert("Only project hosts can delete the project", "error");
      return;
    }

    if (!projectId) {
      showCustomAlert("Project ID is missing", "error");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      showCustomAlert("User not logged in", "error");
      return;
    }

    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    if (!userId) {
      showCustomAlert("User ID not found", "error");
      return;
    }

    if (deleteConfirmInput !== settings.projectName) {
      showCustomAlert("Project name does not match", "warning");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/delete_project.php", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        showCustomAlert("Project deleted successfully!", "success");
        setShowDeleteModal(false);
        if (setTeacherActivePage) {
          setTeacherActivePage("projects");
        }
      } else {
        setDeleteError(result.message || "Failed to delete project");
        showCustomAlert(result.message || "Failed to delete project", "error");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      setDeleteError("Network error. Please try again.");
      showCustomAlert("Network error. Please try again.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filterMembers = (members) => {
    if (!memberSearchTerm.trim()) return members;
    const searchLower = memberSearchTerm.toLowerCase();
    return members.filter(member => 
      (member.FirstName?.toLowerCase() || '').includes(searchLower) ||
      (member.LastName?.toLowerCase() || '').includes(searchLower) ||
      (member.Email?.toLowerCase() || '').includes(searchLower)
    );
  };

  const filterRequests = (requests) => {
    if (!memberSearchTerm.trim()) return requests;
    const searchLower = memberSearchTerm.toLowerCase();
    return requests.filter(request => 
      request.name.toLowerCase().includes(searchLower) ||
      request.email.toLowerCase().includes(searchLower)
    );
  };

  const projectLeads = filterMembers(projectMembers.filter(m => m.ProjectRole === 'Host' || m.ProjectRole === 'Co-Host'));
  const members = filterMembers(projectMembers.filter(m => m.ProjectRole === 'Member'));
  const filteredRequests = filterRequests(joinRequests);
  const canAccessDangerZone = isHost && !isArchived;

  return (
    <div className="tpd-settings">
      {/* Custom Alert Popup */}
      {showAlertPopup && (
        <div className="modern-popup-overlay">
          <div className="modern-popup" style={{ maxWidth: "400px" }}>
            <div className={`modern-popup-header ${alertType}`} style={{
              background: alertType === "success" 
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : alertType === "error"
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : alertType === "warning"
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            }}>
              <h3>
                {alertType === "success" && "✓ Success"}
                {alertType === "error" && "✗ Error"}
                {alertType === "warning" && "⚠ Warning"}
                {alertType === "info" && "ℹ Information"}
              </h3>
            </div>
            <div className="modern-popup-content" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1rem", margin: "20px 0", color: "#374151" }}>
                {alertMessage}
              </p>
            </div>
            <div className="modern-popup-footer centered">
              <button 
                className="modern-btn modern-btn-primary" 
                onClick={() => setShowAlertPopup(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {showRemoveMemberModal && selectedMemberToRemove && (
        <div className="modern-popup-overlay">
          <div className="modern-popup">
            <div className="modern-popup-header" style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}>
              <h3>⚠️ Remove Member</h3>
              <p>Are you sure you want to remove this member?</p>
            </div>
            <div className="modern-popup-content" style={{ textAlign: "center" }}>
              <div className="user-info-display">
                <p><strong>Member:</strong> {selectedMemberToRemove.name}</p>
                <p><strong>Action:</strong> This member will lose access to all project data</p>
              </div>
              <div className="info-box">
                <p>⚠️ This action cannot be undone. The member will need to rejoin the project.</p>
              </div>
            </div>
            <div className="modern-popup-footer double-buttons">
              <button className="modern-btn modern-btn-secondary" onClick={() => setShowRemoveMemberModal(false)}>
                Cancel
              </button>
              <button className="modern-btn modern-btn-danger" onClick={async () => {
                await handleRemoveMemberConfirm(selectedMemberToRemove.id);
                setShowRemoveMemberModal(false);
              }}>
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="tpd-settings-layout">
        {/* Settings Sidebar */}
        <div className="tpd-settings-sidebar">
          <h3 className="tpd-settings-sidebar-title">{isArchived ? "ARCHIVED PROJECT (READ ONLY)" : "Settings"}</h3>
          {[
            { key: "general", label: "General", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg> },
            { key: "members", label: "Members", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, badgeCount: joinRequests.length },
            ...(canAccessDangerZone ? [{ key: "danger", label: "Danger Zone", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> }] : [])
          ].filter(Boolean).map(item => (
            <button 
              key={item.key} 
              className={`tpd-settings-nav-item ${activeSettingsTab === item.key ? "active" : ""}`} 
              onClick={() => setActiveSettingsTab(item.key)}
              style={{ position: 'relative' }}
            >
              {item.icon}
              {item.label}
              {item.badgeCount > 0 && item.key === 'members' && (
                <>
                  <span 
                    className="nav-badge" 
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: '#ff6a00',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: '12px',
                      minWidth: '18px',
                      textAlign: 'center'
                    }}
                  >
                    {item.badgeCount > 9 ? '9+' : item.badgeCount}
                  </span>
                  <span 
                    style={{
                      position: 'absolute',
                      right: '30px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '12px',
                      animation: 'bounce 1s ease infinite'
                    }}
                  >
                    !
                  </span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="tpd-settings-content">
          {activeSettingsTab === "general" && (
            <div className="tpd-settings-section">
              <h3 className="tpd-settings-title">General Settings {isArchived && "(Read Only)"}</h3>
              <p className="tpd-settings-desc">Manage your project details and preferences.</p>
              
              {!isHost && !isArchived && (
                <div className="tpd-role-info" style={{
                  backgroundColor: '#e8f4fd',
                  color: '#0a5d7e',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  <strong>Note:</strong> You have {isCoHost ? 'Co-Host' : 'Member'} permissions. Some settings may be restricted.
                </div>
              )}

              {isArchived && (
                <div className="tpd-role-info" style={{
                  backgroundColor: '#f0f0f0',
                  color: '#666',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  <strong>🔒 This project is archived.</strong> All settings are read-only.
                </div>
              )}

              {saveSuccess && (
                <div className="tpd-success-message" style={{
                  backgroundColor: '#d4edda',
                  color: '#155724',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  Project updated successfully!
                </div>
              )}

              {saveError && (
                <div className="tpd-error-message" style={{
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  ⚠ {saveError}
                </div>
              )}

              <div className="tpd-form-group">
                <label className="tpd-form-label">Project Name</label>
                <input 
                  className="tpd-form-input" 
                  value={settings.projectName} 
                  onChange={e => setSettings(s => ({ ...s, projectName: e.target.value }))} 
                  placeholder="Enter project name"
                  disabled={!isHost || isArchived}
                  readOnly={isArchived}
                />
                {!isHost && !isArchived && (
                  <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
                    Only project host can edit project name
                  </small>
                )}
              </div>

              <div className="tpd-form-group">
                <label className="tpd-form-label">Project Code</label>
                <div className="tpd-code-field">
                  <input 
                    className="tpd-form-input tpd-code-input" 
                    value={settings.projectCode} 
                    disabled
                    readOnly
                    placeholder="Project code"
                  />
                  <button 
                    className="tpd-copy-btn" 
                    onClick={handleCopyCode}
                    title="Copy project code"
                    style={{
                      backgroundColor: copied ? '#28a745' : '#f9f9fb',
                      color: copied ? 'white' : '#555'
                    }}
                  >
                    {copied ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    )}
                  </button>
                </div>
                <span className="tpd-form-hint">Share this code with team members to join the project.</span>
              </div>

              <div className="tpd-form-group">
                <label className="tpd-form-label">Project Description</label>
                <textarea 
                  className="tpd-form-textarea" 
                  rows={3} 
                  value={settings.projectDescription} 
                  onChange={e => setSettings(s => ({ ...s, projectDescription: e.target.value }))} 
                  placeholder="Describe your project..."
                  disabled={!isHost || isArchived}
                  readOnly={isArchived}
                />
              </div>

              {!isArchived && isHost && (
                <button 
                  className="tpd-btn-primary" 
                  style={{ marginTop: 8 }}
                  onClick={handleSaveChanges}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          )}

          {activeSettingsTab === "members" && (
            <div className="tpd-settings-section">
              <div className="tpd-members-header">
                <div>
                  <h3 className="tpd-settings-title">Members {isArchived && "(Read Only)"}</h3>
                  <p className="tpd-settings-desc">Manage project members and their roles.</p>
                </div>
                {(isHost || isCoHost) && !isArchived && (
                  <button className="tpd-btn-primary" onClick={() => setShowInviteModal(true)}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Invite Member
                  </button>
                )}
              </div>

              {isArchived && (
                <div className="tpd-role-info" style={{
                  backgroundColor: '#f0f0f0',
                  color: '#666',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  <strong>🔒 Archived project - Members are view-only</strong>
                </div>
              )}

              <div className="tpd-member-search" style={{ marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: '#999',
                      pointerEvents: 'none'
                    }}
                  >
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    className="tpd-form-input"
                    placeholder="Search members by name or email..."
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    style={{ 
                      paddingLeft: '36px',
                      width: '100%'
                    }}
                  />
                  {memberSearchTerm && (
                    <button
                      onClick={() => setMemberSearchTerm("")}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px 8px'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div style={{
                display: 'flex',
                borderBottom: '2px solid #e0e0e0',
                marginBottom: '24px',
                gap: '4px',
                flexWrap: 'wrap'
              }}>
                <button
                  className={`member-tab ${activeMemberTab === 'leads' ? 'active' : ''}`}
                  onClick={() => setActiveMemberTab('leads')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: activeMemberTab === 'leads' ? '#ff6a00' : '#666',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeMemberTab === 'leads' ? '3px solid #ff6a00' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  Project Host/Co-Host ({projectLeads.length})
                </button>
                
                <button
                  className={`member-tab ${activeMemberTab === 'members' ? 'active' : ''}`}
                  onClick={() => setActiveMemberTab('members')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: activeMemberTab === 'members' ? '#ff6a00' : '#666',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeMemberTab === 'members' ? '3px solid #ff6a00' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  Team Members ({members.length})
                </button>

                {!isArchived && isHost && (
                  <button
                    className={`member-tab ${activeMemberTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveMemberTab('requests')}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: activeMemberTab === 'requests' ? '#ff6a00' : '#666',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeMemberTab === 'requests' ? '3px solid #ff6a00' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'relative'
                    }}
                  >
                    Join Requests
                    {joinRequests.length > 0 && (
                      <span style={{
                        background: '#ff6a00',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '12px',
                        minWidth: '20px',
                        textAlign: 'center',
                        animation: 'badgePulse 0.5s ease'
                      }}>
                        {joinRequests.length}
                      </span>
                    )}
                    {joinRequests.length > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        fontSize: '14px',
                        animation: 'bounce 1s ease infinite'
                      }}>
                        !
                      </span>
                    )}
                  </button>
                )}
              </div>

              {loadingMembers || loadingRequests ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  Loading members...
                </div>
              ) : (
                <>
                  {activeMemberTab === 'leads' && (
                    <>
                      {projectLeads.length > 0 ? (
                        <div className="tpd-members-group">
                          <div 
                            className="tpd-members-list-container" 
                            style={{ 
                              maxHeight: projectLeads.length > 4 ? '300px' : 'auto',
                              overflowY: projectLeads.length > 4 ? 'auto' : 'visible',
                              paddingRight: projectLeads.length > 4 ? '8px' : '0'
                            }}
                          >
                            <div className="tpd-members-list">
                              {projectLeads.map(member => (
                                <div className="tpd-member-row" key={member.UserID}>
                                  <div className="tpd-member-row-left">
                                    <div className={`tpd-member-avatar-lg ${member.ProjectRole === 'Host' ? 'host' : 'cohost'}`}>
                                      {member.FirstName?.[0]}{member.LastName?.[0]}
                                    </div>
                                    <div>
                                      <span className="tpd-member-name-lg">
                                        {member.FirstName} {member.LastName}
                                        {member.UserID === currentUserId && " (You)"}
                                      </span>
                                      <span className="tpd-member-email">{member.Email}</span>
                                    </div>
                                  </div>
                                  <div className="tpd-member-row-right">
                                    {member.ProjectRole === 'Host' ? (
                                      <span className="tpd-role-badge host">Host</span>
                                    ) : (
                                      <>
                                        {!isArchived && isHost && member.UserID !== currentUserId ? (
                                          <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <button 
                                              className="tpd-role-badge cohost clickable"
                                              onClick={() => setOpenRoleDropdown(openRoleDropdown === member.UserID ? null : member.UserID)}
                                              disabled={updatingRole}
                                              style={{ cursor: 'pointer' }}
                                            >
                                              Co-Host ▼
                                            </button>
                                            {openRoleDropdown === member.UserID && (
                                              <div className="tpd-role-dropdown">
                                                <button
                                                  className="tpd-role-option"
                                                  onClick={() => handleRoleChange(member.UserID, 'Co-Host')}
                                                >
                                                  Co-Host
                                                </button>
                                                <button
                                                  className="tpd-role-option"
                                                  onClick={() => handleRoleChange(member.UserID, 'Member')}
                                                >
                                                  Member
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="tpd-role-badge cohost">Co-Host</span>
                                        )}
                                        
                                        {!isArchived && isHost && member.ProjectRole === 'Co-Host' && member.UserID !== currentUserId && (
                                          <button 
                                            className="tpd-btn-ghost"
                                            onClick={() => handleRemoveMember(member.UserID, `${member.FirstName} ${member.LastName}`)}
                                            style={{ marginLeft: '8px' }}
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {projectLeads.length > 4 && (
                            <div style={{ 
                              textAlign: 'center', 
                              marginTop: '10px', 
                              fontSize: '12px', 
                              color: '#888' 
                            }}>
                              Showing {projectLeads.length} members. Scroll to see more.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                          {memberSearchTerm ? "No matching project hosts or co-hosts found." : "No project hosts or co-hosts found."}
                        </div>
                      )}
                    </>
                  )}

                  {activeMemberTab === 'members' && (
                    <>
                      {members.length > 0 ? (
                        <div className="tpd-members-group">
                          <div 
                            className="tpd-members-list-container" 
                            style={{ 
                              maxHeight: members.length > 4 ? '300px' : 'auto',
                              overflowY: members.length > 4 ? 'auto' : 'visible',
                              paddingRight: members.length > 4 ? '8px' : '0'
                            }}
                          >
                            <div className="tpd-members-list">
                              {members.map(member => (
                                <div className="tpd-member-row" key={member.UserID}>
                                  <div className="tpd-member-row-left">
                                    <div className="tpd-member-avatar-lg">
                                      {member.FirstName?.[0]}{member.LastName?.[0]}
                                    </div>
                                    <div>
                                      <span className="tpd-member-name-lg">
                                        {member.FirstName} {member.LastName}
                                        {member.UserID === currentUserId && " (You)"}
                                      </span>
                                      <span className="tpd-member-email">{member.Email}</span>
                                    </div>
                                  </div>
                                  <div className="tpd-member-row-right">
                                    {!isArchived && isHost ? (
                                      <div style={{ position: 'relative' }}>
                                        <button 
                                          className="tpd-role-badge team-member clickable"
                                          onClick={() => setOpenRoleDropdown(openRoleDropdown === member.UserID ? null : member.UserID)}
                                          disabled={updatingRole}
                                          style={{ cursor: 'pointer' }}
                                        >
                                          Member ▼
                                        </button>
                                        {openRoleDropdown === member.UserID && (
                                          <div className="tpd-role-dropdown">
                                            <button
                                              className="tpd-role-option"
                                              onClick={() => handleRoleChange(member.UserID, 'Co-Host')}
                                            >
                                              Co-Host
                                            </button>
                                            <button
                                              className="tpd-role-option"
                                              onClick={() => handleRoleChange(member.UserID, 'Member')}
                                            >
                                              Member
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="tpd-role-badge team-member">Member</span>
                                    )}
                                    {!isArchived && isHost && member.UserID !== currentUserId && (
                                      <button 
                                        className="tpd-btn-ghost"
                                        onClick={() => handleRemoveMember(member.UserID, `${member.FirstName} ${member.LastName}`)}
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {members.length > 4 && (
                            <div style={{ 
                              textAlign: 'center', 
                              marginTop: '10px', 
                              fontSize: '12px', 
                              color: '#888' 
                            }}>
                              Showing {members.length} members. Scroll to see more.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                          {memberSearchTerm ? "No matching team members found." : "No team members found."}
                        </div>
                      )}
                    </>
                  )}

                  {!isArchived && activeMemberTab === 'requests' && isHost && (
                    <>
                      {filteredRequests.length > 0 ? (
                        <div className="tpd-members-group">
                          <div 
                            className="tpd-members-list-container" 
                            style={{ 
                              maxHeight: filteredRequests.length > 4 ? '300px' : 'auto',
                              overflowY: filteredRequests.length > 4 ? 'auto' : 'visible',
                              paddingRight: filteredRequests.length > 4 ? '8px' : '0'
                            }}
                          >
                            <div className="tpd-members-list">
                              {filteredRequests.map(request => {
                                const userId = request.id.replace('req-', '');
                                
                                return (
                                  <div className="tpd-member-row" key={request.id}>
                                    <div className="tpd-member-row-left">
                                      <div className="tpd-member-avatar-lg pending">
                                        {request.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                                      </div>
                                      <div>
                                        <span className="tpd-member-name-lg">
                                          {request.name}
                                        </span>
                                        <span className="tpd-member-email">{request.email}</span>
                                      </div>
                                    </div>
                                    <div className="tpd-member-row-right">
                                      {isHost ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                          <button 
                                            className="tpd-request-approve-icon"
                                            onClick={() => handleApproveRequest(request.id, parseInt(userId))}
                                            title="Approve"
                                            style={{
                                              background: '#e6f9ed',
                                              color: '#2d9b53',
                                              border: 'none',
                                              borderRadius: '6px',
                                              width: '32px',
                                              height: '32px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={e => {
                                              e.target.style.background = '#2d9b53';
                                              e.target.style.color = 'white';
                                            }}
                                            onMouseLeave={e => {
                                              e.target.style.background = '#e6f9ed';
                                              e.target.style.color = '#2d9b53';
                                            }}
                                          >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                          </button>
                                          <button 
                                            className="tpd-request-reject-icon"
                                            onClick={() => handleRejectRequest(request.id, parseInt(userId))}
                                            title="Reject"
                                            style={{
                                              background: '#fde8e8',
                                              color: '#e15050',
                                              border: 'none',
                                              borderRadius: '6px',
                                              width: '32px',
                                              height: '32px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={e => {
                                              e.target.style.background = '#e15050';
                                              e.target.style.color = 'white';
                                            }}
                                            onMouseLeave={e => {
                                              e.target.style.background = '#fde8e8';
                                              e.target.style.color = '#e15050';
                                            }}
                                          >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <line x1="18" y1="6" x2="6" y2="18"/>
                                              <line x1="6" y1="6" x2="18" y2="18"/>
                                            </svg>
                                          </button>
                                        </div>
                                      ) : (
                                        <span style={{ color: '#d97706', fontWeight: 600, fontSize: '13px' }}>
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {filteredRequests.length > 4 && (
                            <div style={{ 
                              textAlign: 'center', 
                              marginTop: '10px', 
                              fontSize: '12px', 
                              color: '#888' 
                            }}>
                              Showing {filteredRequests.length} requests. Scroll to see more.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                          {memberSearchTerm ? "No matching join requests found." : "No join requests found."}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeSettingsTab === "danger" && canAccessDangerZone && (
            <div className="tpd-settings-section">
              <h3 className="tpd-settings-title" style={{ color: '#e15050' }}>
                Danger Zone
              </h3>
              <p className="tpd-settings-desc">
                Irreversible and destructive actions. Proceed with caution.
              </p>

              <div className="tpd-danger-card">
                <div>
                  <h4 className="tpd-danger-title">Archive This Project</h4>
                  <p className="tpd-danger-desc">
                    Mark the project as archived. It will be read-only and hidden from your active projects.
                    You can restore it later from the archives.
                  </p>
                </div>
                <button 
                  className="tpd-btn-outline-danger"
                  onClick={() => setShowArchiveModal(true)}
                >
                  Archive Project
                </button>
              </div>

              <div className="tpd-danger-card critical">
                <div>
                  <h4 className="tpd-danger-title">Delete This Project</h4>
                  <p className="tpd-danger-desc">
                    Permanently delete the project and all associated data. 
                    The project will be moved to archive before deletion.
                    <strong style={{ color: '#e15050', display: 'block', marginTop: '8px' }}>
                      This action cannot be undone!
                    </strong>
                  </p>
                </div>
                <button 
                  className="tpd-btn-danger"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete Project
                </button>
              </div>
            </div>
          )}

          {activeSettingsTab === "danger" && !canAccessDangerZone && !isArchived && (
            <div className="tpd-settings-section">
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#f9f9f9',
                borderRadius: '12px',
                color: '#666'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e15050" style={{ marginBottom: '16px' }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3 style={{ margin: '0 0 8px', color: '#e15050' }}>Access Restricted</h3>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Only project hosts can access the Danger Zone.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="teacher-modal-backdrop" onClick={() => { 
          if (!isLoading) {
            setShowInviteModal(false); 
            setInviteEmail(""); 
            setInviteRole("Team Member");
          }
        }}>
          <div className="tpd-invite-modal" onClick={e => e.stopPropagation()}>
            <div className="tpd-invite-modal-header">
              <h3>Invite Member</h3>
              <button 
                className="tpd-close-btn" 
                onClick={() => { 
                  setShowInviteModal(false); 
                  setInviteEmail(""); 
                  setInviteRole("Team Member");
                }}
                disabled={isLoading}
              >
                &times;
              </button>
            </div>
            <div className="tpd-invite-modal-body">
              <div className="tpd-form-group">
                <label className="tpd-form-label">Email Address</label>
                <input
                  className="tpd-form-input"
                  type="email"
                  placeholder="name@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              <div className="tpd-form-group">
                <label className="tpd-form-label">Role</label>
                <div className="tpd-role-select">
                  <button
                    className={`tpd-role-option ${inviteRole === "Project Co-Host" ? "active instructor" : ""}`}
                    onClick={() => !isLoading && setInviteRole("Project Co-Host")}
                    disabled={isLoading || !isHost}
                    type="button"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>Project Co-Host</span>
                  </button>
                  <button
                    className={`tpd-role-option ${inviteRole === "Team Member" ? "active member" : ""}`}
                    onClick={() => !isLoading && setInviteRole("Team Member")}
                    disabled={isLoading}
                    type="button"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/></svg>
                    <span>Team Member</span>
                  </button>
                </div>
                {!isHost && (
                  <small style={{ color: '#999', display: 'block', marginTop: '8px', fontSize: '11px' }}>
                    Only hosts can invite Co-Hosts
                  </small>
                )}
              </div>
            </div>
            <div className="tpd-invite-modal-footer">
              <button 
                className="tpd-btn-outline" 
                onClick={() => { 
                  setShowInviteModal(false); 
                  setInviteEmail(""); 
                  setInviteRole("Team Member");
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                className="tpd-btn-primary" 
                onClick={handleInviteMember}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="teacher-modal-backdrop" onClick={() => setShowArchiveModal(false)}>
          <div className="tpd-invite-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="tpd-invite-modal-header">
              <h3 style={{ color: '#e15050' }}>Archive Project</h3>
              <button className="tpd-close-btn" onClick={() => setShowArchiveModal(false)}>&times;</button>
            </div>
            <div className="tpd-invite-modal-body">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e15050" strokeWidth="1.5">
                  <path d="M21 8v13H3V8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 3H1v5h22V3z" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="10" y1="12" x2="14" y2="12" strokeLinecap="round"/>
                </svg>
              </div>
              
              <p style={{ textAlign: 'center', marginBottom: '10px', fontSize: '16px' }}>
                Are you sure you want to archive <strong>{settings.projectName}</strong>?
              </p>
              <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                The project will be moved to archives and become read-only. 
                You can restore it later from the Archives page.
              </p>

              {archiveError && (
                <div style={{
                  backgroundColor: '#fde8e8',
                  color: '#e15050',
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  fontSize: '13px',
                  textAlign: 'center'
                }}>
                  ⚠ {archiveError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  className="tpd-btn-outline"
                  onClick={() => setShowArchiveModal(false)}
                  disabled={archiveLoading}
                >
                  Cancel
                </button>
                <button 
                  className="tpd-btn-outline-danger"
                  onClick={handleArchiveProject}
                  disabled={archiveLoading}
                >
                  {archiveLoading ? "Archiving..." : "Confirm Archive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="teacher-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="tpd-invite-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="tpd-invite-modal-header">
              <h3 style={{ color: '#e15050' }}>⚠️ Permanently Delete Project</h3>
              <button className="tpd-close-btn" onClick={() => setShowDeleteModal(false)}>&times;</button>
            </div>
            <div className="tpd-invite-modal-body">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e15050" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              
              <p style={{ textAlign: 'center', marginBottom: '10px', fontSize: '16px', fontWeight: 'bold', color: '#e15050' }}>
                This action cannot be undone!
              </p>
              <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '15px' }}>
                You are about to permanently delete <strong>{settings.projectName}</strong>.
              </p>
              
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#e15050' }}>
                  <strong>This will:</strong>
                </p>
                <ul style={{ margin: '0', paddingLeft: '20px', color: '#666', fontSize: '13px' }}>
                  <li>Archive the project permanently</li>
                  <li>Delete all tasks associated with this project</li>
                  <li>Remove all team members from the project</li>
                  <li>Make the project inaccessible to everyone</li>
                </ul>
              </div>

              <p style={{ textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>
                Type <strong>"{settings.projectName}"</strong> to confirm:
              </p>
              
              <input
                type="text"
                className="tpd-form-input"
                placeholder="Enter project name"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                style={{ marginBottom: '15px' }}
              />

              {deleteError && (
                <div style={{
                  backgroundColor: '#fde8e8',
                  color: '#e15050',
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  fontSize: '13px',
                  textAlign: 'center'
                }}>
                  ⚠ {deleteError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  className="tpd-btn-outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmInput("");
                    setDeleteError("");
                  }}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button 
                  className="tpd-btn-danger"
                  onClick={handleDeleteProject}
                  disabled={deleteLoading || deleteConfirmInput !== settings.projectName}
                  style={{ 
                    opacity: (deleteLoading || deleteConfirmInput !== settings.projectName) ? 0.5 : 1,
                    cursor: (deleteLoading || deleteConfirmInput !== settings.projectName) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {deleteLoading ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Activities Page Component (Updated with custom modals)
function ActivitiesPage({ projectId, isArchived, onActivityClick, onRestoreTask, onTaskClick }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeActivityTab, setActiveActivityTab] = useState("feed");
  const [activities, setActivities] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState("");
  const [restoringTask, setRestoringTask] = useState(null);
  const [readActivities, setReadActivities] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Restore Task Modal
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreTaskId, setRestoreTaskId] = useState(null);
  const [restoreTaskName, setRestoreTaskName] = useState("");
  
  // Custom Alert Popup
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");

  const showCustomAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertPopup(true);
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setCurrentUserId(storedUser.UserID || storedUser.user_id || storedUser.id);
    }
  }, []);

  useEffect(() => {
    if (projectId && currentUserId) {
      const storageKey = `read_activities_${projectId}_${currentUserId}`;
      const savedReadActivities = localStorage.getItem(storageKey);
      if (savedReadActivities) {
        try {
          const parsed = JSON.parse(savedReadActivities);
          setReadActivities(new Set(parsed));
        } catch (e) {
          console.error("Error loading read activities:", e);
        }
      }
    }
  }, [projectId, currentUserId]);

  useEffect(() => {
    if (projectId && currentUserId && readActivities.size > 0) {
      const storageKey = `read_activities_${projectId}_${currentUserId}`;
      localStorage.setItem(storageKey, JSON.stringify([...readActivities]));
    }
  }, [readActivities, projectId, currentUserId]);

  useEffect(() => {
    if (activities.length > 0) {
      const unread = activities.filter(activity => !readActivities.has(activity.LogID)).length;
      setUnreadCount(unread);
    } else {
      setUnreadCount(0);
    }
  }, [activities, readActivities]);

  useEffect(() => {
    const fetchUserProjectRole = async () => {
      if (!projectId || !currentUserId) return;
      
      try {
        const response = await fetch(
          `https://accesspmt.bsit3a2025.com/api/general/get_project_members.php?ProjectID=${projectId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        if (result.status === "success") {
          const currentUser = result.members.find(m => m.UserID === currentUserId);
          if (currentUser) {
            setUserProjectRole(currentUser.ProjectRole);
          }
        }
      } catch (err) {
        console.error("Error fetching user project role:", err);
      }
    };

    fetchUserProjectRole();
  }, [projectId, currentUserId]);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!projectId) return;
      
      setLoading(true);
      try {
        const response = await fetch(
          `https://accesspmt.bsit3a2025.com/api/activities/get_activity_feed.php?ProjectID=${projectId}&limit=100`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        if (result.status === "success") {
          setActivities(result.activities || []);
        }
      } catch (err) {
        console.error("Error fetching activities:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [projectId]);

  useEffect(() => {
    const fetchArchivedTasks = async () => {
      if (!projectId) return;
      
      setLoadingArchived(true);
      try {
        const response = await fetch(
          `https://accesspmt.bsit3a2025.com/api/activities/get_archived_tasks.php?ProjectID=${projectId}&limit=50`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        if (result.status === "success") {
          setArchivedTasks(result.archived_tasks || []);
        }
      } catch (err) {
        console.error("Error fetching archived tasks:", err);
      } finally {
        setLoadingArchived(false);
      }
    };

    fetchArchivedTasks();
  }, [projectId]);

  useEffect(() => {
    const fetchPermissionRequests = async () => {
      if (!projectId || !currentUserId) return;
      
      setLoadingRequests(true);
      try {
        const response = await fetch(
          `https://accesspmt.bsit3a2025.com/api/activities/get_permission_requests.php?ProjectID=${projectId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        if (result.status === "success") {
          setPermissionRequests(result.requests || []);
        }
      } catch (err) {
        console.error("Error fetching permission requests:", err);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchPermissionRequests();
  }, [projectId, currentUserId]);

  const handleActivityClickWithRead = (activity) => {
    if (!readActivities.has(activity.LogID)) {
      setReadActivities(prev => new Set([...prev, activity.LogID]));
    }
    if (onActivityClick) {
      onActivityClick(activity);
    }
  };

  const markAllAsRead = () => {
    if (activities.length === 0) return;
    
    const allActivityIds = activities.map(activity => activity.LogID);
    setReadActivities(new Set([...readActivities, ...allActivityIds]));
  };

  const getInitials = (name) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const getActionIcon = (action) => {
    if (!action) return "📋";
    if (action.includes("Created task")) return "📝";
    if (action.includes("Updated task status")) return "🔄";
    if (action.includes("Renamed task")) return "✏️";
    if (action.includes("Updated due date")) return "📅";
    if (action.includes("Added attachment")) return "📎";
    if (action.includes("Assigned users")) return "👥";
    if (action.includes("Removed assignees")) return "👤";
    if (action.includes("Joined project")) return "➕";
    if (action.includes("Invited member")) return "📧";
    if (action.includes("Removed member")) return "❌";
    if (action.includes("Updated member role")) return "👔";
    if (action.includes("Updated project")) return "⚙️";
    if (action.includes("Archived task")) return "📦";
    if (action.includes("Restored task")) return "♻️";
    return "📋";
  };

  const openRestoreModal = (taskId, taskName) => {
    setRestoreTaskId(taskId);
    setRestoreTaskName(taskName);
    setShowRestoreModal(true);
  };

  const confirmRestoreTask = async () => {
    if (!restoreTaskId) return;

    setRestoringTask(restoreTaskId);
    
    try {
      await onRestoreTask(restoreTaskId);
      setArchivedTasks(prev => prev.filter(task => task.TaskID !== restoreTaskId));
      showCustomAlert("Task restored successfully!", "success");
      setShowRestoreModal(false);
    } catch (err) {
      console.error("Error restoring task:", err);
      showCustomAlert("Failed to restore task", "error");
    } finally {
      setRestoringTask(null);
      setRestoreTaskId(null);
      setRestoreTaskName("");
    }
  };

  const handleApproveRequest = async (requestId, e) => {
    e.stopPropagation();
    const request = permissionRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/activities/update_task_assignee_permission.php", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          TaskID: request.taskId,
          UserID: userId,
          TargetUserID: request.userId,
          action: "approve"
        })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error("Server returned invalid JSON");
      }

      if (result.status === "success") {
        setPermissionRequests(prev => prev.filter(r => r.id !== requestId));
        showCustomAlert("Permission approved! Task has been moved to For Review and user can now update status.", "success");
      } else {
        showCustomAlert(result.message || "Failed to approve request", "error");
      }
    } catch (err) {
      console.error("Error approving request:", err);
      showCustomAlert(`Error: ${err.message}`, "error");
    }
  };

  const handleRejectRequest = async (requestId, e) => {
    e.stopPropagation();
    const request = permissionRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/activities/update_task_assignee_permission.php", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          TaskID: request.taskId,
          UserID: userId,
          TargetUserID: request.userId,
          action: "reject"
        })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error("Server returned invalid JSON");
      }

      if (result.status === "success") {
        setPermissionRequests(prev => prev.filter(r => r.id !== requestId));
        showCustomAlert("Request rejected.", "info");
      } else {
        showCustomAlert(result.message || "Failed to reject request", "error");
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
      showCustomAlert(`Error: ${err.message}`, "error");
    }
  };

// In ActivitiesPage component, update handleArchivedTaskClick:
const handleArchivedTaskClick = (task) => {
  if (onTaskClick) {
    onTaskClick({
      id: task.TaskID,
      content: task.TaskName,
      description: task.Description || "",
      due: task.DueDate || "TBD",
      status: "Archived",
      assigned: task.AssignedToNames || [],
      assignedIds: task.AssignedToIds || [],
      attachments: task.Attachments || [],
      comments: [],
      projectName: task.ProjectName,
      projectId: projectId,
      isArchivedTask: true,  // Add this flag to indicate it's an archived task
      canRestore: isHostOrCoHost  // Add this flag to indicate if user can restore
    });
  }
};

// In ActivitiesPage component, update handlePermissionRequestClick:
const handlePermissionRequestClick = (request) => {
  if (onTaskClick && request.taskId) {
    onTaskClick({
      id: request.taskId,
      content: request.taskName || request.task,
      description: request.taskDescription || "",
      due: request.dueDate || "TBD",
      status: request.currentStatus || "In Progress",
      assigned: request.assignedNames || [],
      assignedIds: request.assignedIds || [],
      attachments: [],
      comments: [],
      projectName: request.projectName,
      projectId: projectId,
      isPermissionRequest: true,
      requestedUserId: request.userId  // Add the user ID who made the request
    });
  }
};

  const filteredActivities = (activities || []).filter(activity =>
    activity?.Action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity?.Description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity?.UserName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredArchivedTasks = (archivedTasks || []).filter(task =>
    task?.TaskName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task?.Description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task?.ArchivedBy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRequests = (permissionRequests || []).filter(request => {
    if (!request) return false;
    const taskName = request.taskName || request.task || '';
    const requester = request.requester || '';
    return taskName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           requester.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const isHostOrCoHost = userProjectRole === 'Host' || userProjectRole === 'Co-Host';

  if (loading || loadingArchived || loadingRequests) {
    return <div className="tpd-loading">Loading activities...</div>;
  }

  return (
    <div className="tpd-activities">
      {/* Custom Alert Popup */}
      {showAlertPopup && (
        <div className="modern-popup-overlay">
          <div className="modern-popup" style={{ maxWidth: "400px" }}>
            <div className={`modern-popup-header ${alertType}`} style={{
              background: alertType === "success" 
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : alertType === "error"
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : alertType === "warning"
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            }}>
              <h3>
                {alertType === "success" && "✓ Success"}
                {alertType === "error" && "✗ Error"}
                {alertType === "warning" && "⚠ Warning"}
                {alertType === "info" && "ℹ Information"}
              </h3>
            </div>
            <div className="modern-popup-content" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1rem", margin: "20px 0", color: "#374151" }}>
                {alertMessage}
              </p>
            </div>
            <div className="modern-popup-footer centered">
              <button 
                className="modern-btn modern-btn-primary" 
                onClick={() => setShowAlertPopup(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Task Confirmation Modal */}
      {showRestoreModal && restoreTaskName && (
        <div className="modern-popup-overlay">
          <div className="modern-popup">
            <div className="modern-popup-header" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
              <h3>♻️ Restore Task</h3>
              <p>Restore this task to active status</p>
            </div>
            <div className="modern-popup-content" style={{ textAlign: "center" }}>
              <div className="user-info-display">
                <p><strong>Task:</strong> {restoreTaskName}</p>
              </div>
              <div className="info-box">
                <p>✅ The task will be restored and set to <strong>To Do</strong> status.</p>
                <p style={{ marginTop: '8px' }}>It will reappear in the active task board.</p>
              </div>
            </div>
            <div className="modern-popup-footer double-buttons">
              <button className="modern-btn modern-btn-secondary" onClick={() => setShowRestoreModal(false)}>
                Cancel
              </button>
              <button className="modern-btn modern-btn-success" onClick={confirmRestoreTask} disabled={restoringTask === restoreTaskId}>
                {restoringTask === restoreTaskId ? "Restoring..." : "Restore Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="tpd-activities-header">
        <div>
          <h3 className="tpd-activities-title">Activity Center {isArchived && "(Read Only)"}</h3>
          <p className="tpd-activities-subtitle">
            {isArchived 
              ? "View historical activities (no new actions allowed)." 
              : "Track project activities and permission requests."}
          </p>
        </div>
        <div className="tpd-activities-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="tpd-search-icon">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input 
            className="tpd-search-input" 
            placeholder="Search activities or requests..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="tpd-activity-tabs">
        <button
          className={`tpd-activity-tab ${activeActivityTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveActivityTab('feed')}
        >
          Logs
          {!isArchived && unreadCount > 0 && (
            <span className="tpd-request-badge" style={{ background: '#20c5e0' }}>
              {unreadCount}
            </span>
          )}
          {!isArchived && unreadCount > 0 && activeActivityTab === 'feed' && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
              style={{
                marginLeft: '8px',
                fontSize: '10px',
                padding: '2px 8px',
                background: '#e8f8fb',
                border: 'none',
                borderRadius: '12px',
                color: '#0ea5c7',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Mark all read
            </button>
          )}
        </button>
        {!isArchived && (
          <button
            className={`tpd-activity-tab ${activeActivityTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveActivityTab('archived')}
          >
            Archived Tasks
            {archivedTasks.length > 0 && (
              <span className="tpd-request-badge">
                {archivedTasks.length}
              </span>
            )}
          </button>
        )}
        {!isArchived && isHostOrCoHost && (
          <button
            className={`tpd-activity-tab ${activeActivityTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveActivityTab('requests')}
          >
            Permission Requests
            {permissionRequests.length > 0 && (
              <span className="tpd-request-badge">
                {permissionRequests.length}
              </span>
            )}
          </button>
        )}
      </div>

      {activeActivityTab === 'feed' && (
        <div className="tpd-activity-feed-container">
          <div className="tpd-notification-feed">
            {filteredActivities.length > 0 ? (
              filteredActivities.map(activity => {
                const isUnread = !readActivities.has(activity.LogID);
                return (
                  <div 
                    key={activity.LogID} 
                    className={`tpd-notification-item ${isUnread ? 'unread' : ''}`}
                    onClick={() => handleActivityClickWithRead(activity)}
                    style={{ 
                      cursor: 'pointer',
                      background: isUnread ? '#f9f9ff' : '#ffffff',
                      borderLeft: isUnread ? '3px solid #20c5e0' : 'none'
                    }}
                  >
                    <div className="tpd-notification-avatar">
                      <span className="tpd-activity-user-avatar" style={{
                        background: activity.UserRole === 'Host' ? '#1a1a2e' : 
                                  activity.UserRole === 'Co-Host' ? '#20c5e0' : '#555'
                      }}>
                        {getInitials(activity.UserName)}
                      </span>
                    </div>
                    <div className="tpd-notification-content">
                      <div className="tpd-notification-header">
                        <h4 className="tpd-notification-title">
                          <span className="tpd-activity-icon">{getActionIcon(activity.Action)}</span> {activity.Action}
                        </h4>
                        <span className="tpd-notification-time">{activity.TimeAgo}</span>
                      </div>
                      {activity.Description && (
                        <p className="tpd-notification-description">{activity.Description}</p>
                      )}
                      <div className="tpd-notification-footer">
                        <span className="tpd-notification-user">
                          <span className="tpd-notification-user-name">{activity.UserName}</span>
                          {activity.UserRole && (
                            <span className="tpd-role-badge" style={{ 
                              background: activity.UserRole === 'Host' ? '#1a1a2e' : 
                                          activity.UserRole === 'Co-Host' ? '#e8f8fb' : '#f0f0f3',
                              color: activity.UserRole === 'Host' ? '#fff' : 
                                    activity.UserRole === 'Co-Host' ? '#0ea5c7' : '#555',
                              marginLeft: '8px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: 600
                            }}>
                              {activity.UserRole}
                            </span>
                          )}
                          {activity.Action?.includes('Archived') && (
                            <span className="tpd-role-badge" style={{ 
                              background: '#fde8e8',
                              color: '#e15050',
                              marginLeft: '8px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '10px'
                            }}>
                              Archived
                            </span>
                          )}
                          {activity.Action?.includes('Restored') && (
                            <span className="tpd-role-badge" style={{ 
                              background: '#e6f9ed',
                              color: '#2d9b53',
                              marginLeft: '8px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '10px'
                            }}>
                              Restored
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="tpd-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#bbb" strokeWidth="1.5"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="#bbb" strokeWidth="1.5"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="#bbb" strokeWidth="2"/>
                </svg>
                <p>No activities found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!isArchived && activeActivityTab === 'archived' && (
        <div className="tpd-request-container">
          <div className="tpd-notification-feed">
            {filteredArchivedTasks.length > 0 ? (
              filteredArchivedTasks.map(task => (
                <div 
                  key={task.TaskID} 
                  className="tpd-notification-item"
                  onClick={() => handleArchivedTaskClick(task)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="tpd-notification-avatar">
                    <span className="tpd-activity-user-avatar" style={{ background: '#e15050' }}>
                      📦
                    </span>
                  </div>
                  <div className="tpd-notification-content">
                    <div className="tpd-notification-header">
                      <h4 className="tpd-notification-title">
                        Archived Task: {task.TaskName}
                      </h4>
                      <span className="tpd-notification-time">{task.TimeAgo}</span>
                    </div>
                    {task.Description && (
                      <p className="tpd-notification-description">{task.Description}</p>
                    )}
                    {task.DueDate && (
                      <p className="tpd-notification-description" style={{ fontSize: '12px', color: '#888' }}>
                        Due: {new Date(task.DueDate).toLocaleDateString()}
                      </p>
                    )}
                    <p className="tpd-notification-description" style={{ fontSize: '12px', color: '#888' }}>
                      Archived by: {task.ArchivedBy}
                    </p>
                    <div className="tpd-notification-footer">
                      <div className="tpd-notification-status">
                        <span className="tpd-notification-user-name">Status: Archived</span>
                      </div>
                      {/* Restore button in archived tasks list - only for Host/Co-Host */}
                      {isHostOrCoHost && (
                        <button 
                          className="tpd-btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRestoreModal(task.TaskID, task.TaskName);
                          }}
                          disabled={restoringTask === task.TaskID}
                          style={{ 
                            fontSize: '12px', 
                            padding: '6px 12px',
                            backgroundColor: '#20c5e0'
                          }}
                        >
                          {restoringTask === task.TaskID ? "Restoring..." : "Restore Task"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="tpd-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#bbb" strokeWidth="1.5"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="#bbb" strokeWidth="1.5"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="#bbb" strokeWidth="2"/>
                </svg>
                <p>No archived tasks found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!isArchived && activeActivityTab === 'requests' && isHostOrCoHost && (
        <div className="tpd-request-container">
          <div className="tpd-notification-feed">
            {filteredRequests.length > 0 ? (
              filteredRequests.map(request => (
                <div 
                  key={request.id} 
                  className="tpd-notification-item"
                  onClick={() => handlePermissionRequestClick(request)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="tpd-notification-avatar">
                    <span className="tpd-activity-user-avatar" style={{ background: '#d97706' }}>
                      {getInitials(request.requester)}
                    </span>
                  </div>
                  <div className="tpd-notification-content">
                    <div className="tpd-notification-header">
                      <h4 className="tpd-notification-title">Permission Request: {request.taskName || request.task}</h4>
                      <span className="tpd-notification-time">{request.timeAgo || 'Just now'}</span>
                    </div>
                    <p className="tpd-notification-description">
                      {request.requester} is requesting to change status from <strong>{request.currentStatus}</strong> to <strong>For Review</strong>
                    </p>
                    <div className="tpd-notification-footer">
                      <div className="tpd-notification-status">
                        <span className="tpd-notification-user-name">{request.requester}</span>
                        <span className="tpd-status-badge" style={{ 
                          backgroundColor: '#fff3e6',
                          color: '#d97706',
                          marginLeft: '8px'
                        }}>
                          pending
                        </span>
                      </div>
                      <div className="tpd-notification-actions" onClick={e => e.stopPropagation()}>
                        <button 
                          className="tpd-request-approve"
                          onClick={(e) => handleApproveRequest(request.id, e)}
                          title="Approve"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button 
                          className="tpd-request-reject"
                          onClick={(e) => handleRejectRequest(request.id, e)}
                          title="Reject"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="tpd-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#bbb" strokeWidth="1.5"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="#bbb" strokeWidth="1.5"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="#bbb" strokeWidth="2"/>
                </svg>
                <p>No permission requests found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Dashboard Component
function TeacherProjectDashboard({ project }) {
  const [teacherTasks, setTeacherTasks] = useState(teacherInitialTasks);
  const [teacherShowModal, setTeacherShowModal] = useState(false);
  const [addShowModal, setAddShowModal] = useState(false);
  const [teacherActivePage, setTeacherActivePage] = useState("overview");
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [isArchived, setIsArchived] = useState(project?.Status === 'Archived');
  const [settings, setSettings] = useState({
    projectName: project?.ProjectName || "Sample Project 1",
    projectDescription: project?.FullDescription || project?.Description || "A collaborative project management dashboard for educational teams.",
    projectCode: project?.Code || "PRJ-2025-001"
  });
  
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const [currentUserRole, setCurrentUserRole] = useState('');
  const [userPermissions, setUserPermissions] = useState({});
  
  const [notificationCounts, setNotificationCounts] = useState({
    activities: 0,
    members: 0,
    settings: 0
  });
  
  const [lastViewed, setLastViewed] = useState({
    activities: null,
    members: null,
    settings: null
  });
  
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  
  // Custom Alert Popup
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");

  // Archive Confirmation Modal State
  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState(false);
  const [archiveTaskId, setArchiveTaskId] = useState(null);
  const [archiveTaskName, setArchiveTaskName] = useState("");
  const [archiving, setArchiving] = useState(false);

  const showCustomAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertPopup(true);
  };

  // Updated isTaskRejected function - only shows rejected for non-Done and non-For Review tasks
  const isTaskRejected = (task) => {
    if (!task || !task.assignedIds) return false;
    
    if (task.status === "For Review" || task.status === "Done") {
      return false;
    }
    
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const currentUserId = storedUser?.UserID || storedUser?.user_id || storedUser?.id;
    
    if (task.rejectedUsers && task.rejectedUsers.includes(currentUserId)) {
      return true;
    }
    
    if (task.assigneeDetails && task.assigneeDetails.length > 0) {
      const currentUserAssignee = task.assigneeDetails.find(
        a => a.UserID === currentUserId
      );
      if (currentUserAssignee && currentUserAssignee.is_rejected) {
        return true;
      }
    }
    
    return false;
  };

  useEffect(() => {
    if (project?.ProjectID && currentUserRole) {
      const storageKey = `last_viewed_${project.ProjectID}_${currentUserRole}`;
      const savedLastViewed = localStorage.getItem(storageKey);
      if (savedLastViewed) {
        try {
          const parsed = JSON.parse(savedLastViewed);
          setLastViewed(parsed);
        } catch (e) {
          console.error("Error loading last viewed:", e);
        }
      }
    }
  }, [project, currentUserRole]);

  useEffect(() => {
    if (project?.ProjectID && currentUserRole && Object.keys(lastViewed).some(key => lastViewed[key] !== null)) {
      const storageKey = `last_viewed_${project.ProjectID}_${currentUserRole}`;
      localStorage.setItem(storageKey, JSON.stringify(lastViewed));
    }
  }, [lastViewed, project, currentUserRole]);

  const updateLastViewed = (section) => {
    setLastViewed(prev => ({
      ...prev,
      [section]: new Date().toISOString()
    }));
  };

  useEffect(() => {
    if (teacherActivePage === 'activities') {
      updateLastViewed('activities');
      setNotificationCounts(prev => ({ ...prev, activities: 0 }));
    }
  }, [teacherActivePage]);

  useEffect(() => {
    if (teacherActivePage === 'settings') {
      updateLastViewed('settings');
      setNotificationCounts(prev => ({ ...prev, settings: 0, members: 0 }));
    }
  }, [teacherActivePage]);

  useEffect(() => {
    if (teacherActivePage === 'settings' && activeSettingsTab === 'members') {
      updateLastViewed('members');
      setNotificationCounts(prev => ({ ...prev, members: 0 }));
    }
  }, [teacherActivePage, activeSettingsTab]);

  useEffect(() => {
    const checkForNewActivities = async () => {
      if (!project?.ProjectID || !currentUserRole) return;
      
      try {
        const response = await fetch(
          `https://accesspmt.bsit3a2025.com/api/activities/get_activity_feed.php?ProjectID=${project.ProjectID}&limit=50`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        
        if (result.status === "success" && result.activities && result.activities.length > 0) {
          const newestActivityDate = result.activities[0]?.LogDate;
          
          if (newestActivityDate && lastViewed.activities) {
            const newestActivityTime = new Date(newestActivityDate).getTime();
            const lastViewedTime = new Date(lastViewed.activities).getTime();
            
            if (newestActivityTime > lastViewedTime) {
              setNotificationCounts(prev => ({ ...prev, activities: 1 }));
            }
          } else if (newestActivityDate && !lastViewed.activities) {
            setNotificationCounts(prev => ({ ...prev, activities: 1 }));
          }
        }
      } catch (err) {
        console.error("Error checking new activities:", err);
      }
    };
    
    checkForNewActivities();
    const interval = setInterval(checkForNewActivities, 30000);
    
    return () => clearInterval(interval);
  }, [project, currentUserRole, lastViewed.activities]);

  useEffect(() => {
    const fetchJoinRequestsCount = async () => {
      if (!project?.ProjectID || !currentUserRole) return;
      
      if (currentUserRole !== 'Host') return;
      
      try {
        const response = await fetch(
          `https://accesspmt.bsit3a2025.com/api/general/get_project_members.php?ProjectID=${project.ProjectID}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        
        if (result.status === "success") {
          const pendingRequests = result.members.filter(m => m.ProjectRole === 'Pending').length;
          
          if (lastViewed.members) {
            if (pendingRequests > 0) {
              setNotificationCounts(prev => ({ ...prev, members: pendingRequests }));
            } else {
              setNotificationCounts(prev => ({ ...prev, members: 0 }));
            }
          } else if (pendingRequests > 0) {
            setNotificationCounts(prev => ({ ...prev, members: pendingRequests }));
          }
        }
      } catch (err) {
        console.error("Error fetching join requests count:", err);
      }
    };
    
    fetchJoinRequestsCount();
    const interval = setInterval(fetchJoinRequestsCount, 30000);
    
    return () => clearInterval(interval);
  }, [project, currentUserRole, lastViewed.members]);

  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!project?.ProjectID) return;
      
      try {
        const response = await fetch(
          `https://accesspmt.bsit3a2025.com/api/general/get_project_members.php?ProjectID=${project.ProjectID}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        
        if (result.status === "success") {
          setProjectMembers(result.members);
        }
      } catch (err) {
        console.error("Error fetching project members:", err);
      }
    };

    fetchProjectMembers();
  }, [project]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && projectMembers.length > 0) {
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
      const currentMember = projectMembers.find(m => m.UserID === userId);
      if (currentMember) {
        setCurrentUserRole(currentMember.ProjectRole);
      }
    }
  }, [projectMembers]);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!project?.ProjectID) return;
      
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser?.UserID || storedUser?.user_id || storedUser?.id;
      
      if (!userId) return;
      
      try {
        const response = await fetch(
          `https://accesspmt.bsit3a2025.com/api/activities/get_task_permissions.php?ProjectID=${project.ProjectID}&UserID=${userId}`
        );
        const result = await response.json();
        
        if (result.status === "success") {
          console.log("Permissions fetched:", result.permissions);
          setUserPermissions(result.permissions || {});
        } else {
          console.error("Failed to fetch permissions:", result);
        }
      } catch (err) {
        console.error("Error fetching user permissions:", err);
      }
    };
    
    fetchUserPermissions();
  }, [project]);

  const fetchTasks = async () => {
    if (!project?.ProjectID) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setWarning(null);

    try {
      const response = await fetch(
        `https://accesspmt.bsit3a2025.com/api/general/get_tasks.php?ProjectID=${project.ProjectID}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        const organizedTasks = {
          todo: [],
          inprogress: [],
          review: [],
          done: []
        };

        result.tasks.forEach(task => {
          const columnKey = statusToColumn[task.Status] || "todo";
          
          const formattedTask = {
            id: task.TaskID.toString(),
            content: task.TaskName,
            description: task.Description || "",
            assigned: task.AssignedTo ? task.AssignedTo.map(user => user.Name) : [],
            assignedIds: task.AssignedTo ? task.AssignedTo.map(user => user.UserID) : [],
            assigneeDetails: task.AssignedTo || [],
            rejectedUsers: task.RejectedUserIds || [],
            due: task.DueDate || "TBD",
            status: task.Status,
            completedAt: task.completed_at,
            attachments: task.Attachment ? [{ name: task.Attachment }] : [],
            comments: [],
            projectId: project.ProjectID,
            projectName: project.ProjectName
          };

          organizedTasks[columnKey].push(formattedTask);
        });

        setTeacherTasks(organizedTasks);
      } else {
        setWarning(result.message || "Failed to fetch tasks");
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setWarning("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [project]);

// Update the openArchiveConfirmModal function
const openArchiveConfirmModal = (taskId, taskName) => {
  setArchiveTaskId(taskId);
  setArchiveTaskName(taskName);
  setShowArchiveConfirmModal(true);
};

  const handleArchiveTask = async () => {
    if (isArchived) {
      showCustomAlert("Cannot archive tasks in an archived project", "error");
      setShowArchiveConfirmModal(false);
      return;
    }

    if (!archiveTaskId) return;

    setArchiving(true);

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/general/update_task.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TaskID: archiveTaskId,
          ProjectID: project?.ProjectID,
          Status: "Archived",
          UpdatedBy: userId,
          UserID: userId
        })
      });

      const result = await response.json();

      if (result.status === "success") {
        showCustomAlert("Task archived successfully!", "success");
        setTeacherShowModal(false);
        setShowArchiveConfirmModal(false);
        await fetchTasks();
      } else {
        showCustomAlert(result.message || "Failed to archive task", "error");
        setShowArchiveConfirmModal(false);
      }
    } catch (err) {
      console.error("Error archiving task:", err);
      showCustomAlert("Network error. Please try again.", "error");
      setShowArchiveConfirmModal(false);
    } finally {
      setArchiving(false);
      setArchiveTaskId(null);
      setArchiveTaskName("");
    }
  };

  const handleRestoreTask = async (taskId) => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/general/update_task.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TaskID: taskId,
          ProjectID: project?.ProjectID,
          Status: "To Do",
          UserID: userId
        })
      });

      const result = await response.json();

      if (result.status === "success") {
        showCustomAlert("Task restored successfully!", "success");
        setTeacherShowModal(false);
        await fetchTasks();
      } else {
        showCustomAlert(result.message || "Failed to restore task", "error");
      }
    } catch (err) {
      console.error("Error restoring task:", err);
      showCustomAlert("Network error. Please try again.", "error");
    }
  };

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity);
    setShowActivityDetail(true);
  };

  const handleTaskClick = (task) => {
    setSelectedTask({ 
      ...task, 
      projectName: project?.ProjectName || "SAMPLE PROJECT 1",
      projectId: project?.ProjectID
    });
    setTeacherShowModal(true);
  };

  const canDragTask = (taskId) => {
    let currentTask = null;
    for (const column of Object.values(teacherTasks)) {
      const found = column.find(task => task.id === taskId);
      if (found) {
        currentTask = found;
        break;
      }
    }
    
    if (!currentTask) return false;
    
    if (currentUserRole === 'Host' || currentUserRole === 'Co-Host') {
      return true;
    }
    
    return false;
  };

  const canMoveToColumn = (task, targetColumn) => {
    const currentStatus = task.status;
    const targetStatus = columnToStatus[targetColumn];
    
    const allowedTransitions = {
      'To Do': ['In Progress'],
      'In Progress': ['For Review', 'Done'],
      'For Review': ['Done'],
      'Done': []
    };
    
    if (targetStatus === currentStatus) return true;
    
    const allowed = allowedTransitions[currentStatus];
    if (!allowed) return false;
    
    return allowed.includes(targetStatus);
  };

  const onDragEnd = async (result) => {
    if (isArchived) {
      showCustomAlert("Cannot modify tasks in an archived project", "error");
      return;
    }
    
    const { source, destination, draggableId } = result;
    
    if (!destination) return;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    let movedTask = null;
    for (const column of Object.values(teacherTasks)) {
      const found = column.find(task => task.id === draggableId);
      if (found) {
        movedTask = found;
        break;
      }
    }
    
    if (!movedTask) return;

    if (!canMoveToColumn(movedTask, destination.droppableId)) {
      const currentStatus = movedTask.status;
      const targetStatus = columnToStatus[destination.droppableId];
      
      if (currentStatus === 'Done') {
        showCustomAlert("Completed tasks cannot be moved. If you need to reopen, please edit the task.", "warning");
      } else if (currentStatus === 'For Review') {
        showCustomAlert("Tasks in For Review can only be moved to Done by the instructor.", "warning");
      } else if (currentStatus === 'In Progress' && targetStatus === 'To Do') {
        showCustomAlert("Tasks in progress cannot be moved back to To Do. Only forward progress is allowed.", "warning");
      } else if (currentStatus === 'For Review' && targetStatus === 'In Progress') {
        showCustomAlert("Tasks in For Review cannot be moved back to In Progress. Only forward to Done is allowed.", "warning");
      } else {
        showCustomAlert(`Cannot move task from "${currentStatus}" to "${targetStatus}". Only forward progress is allowed.`, "warning");
      }
      return;
    }

    if (!canDragTask(draggableId)) {
      showCustomAlert("You don't have permission to move this task. Request permission from a host or co-host.", "error");
      return;
    }

    const sourceTasks = [...teacherTasks[source.droppableId]];
    const destTasks = source.droppableId === destination.droppableId 
      ? sourceTasks 
      : [...teacherTasks[destination.droppableId]];
    
    const [movedTaskObj] = sourceTasks.splice(source.index, 1);
    destTasks.splice(destination.index, 0, movedTaskObj);
    
    const newStatus = columnToStatus[destination.droppableId];
    movedTaskObj.status = newStatus;
    
    if (newStatus === "For Review" || newStatus === "Done") {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const currentUserId = storedUser?.UserID || storedUser?.user_id || storedUser?.id;
      
      if (movedTaskObj.rejectedUsers && movedTaskObj.rejectedUsers.includes(currentUserId)) {
        movedTaskObj.rejectedUsers = movedTaskObj.rejectedUsers.filter(id => id !== currentUserId);
      }
      
      if (movedTaskObj.assigneeDetails) {
        movedTaskObj.assigneeDetails = movedTaskObj.assigneeDetails.map(assignee => {
          if (assignee.UserID === currentUserId) {
            return { ...assignee, is_rejected: false };
          }
          return assignee;
        });
      }
    }
    
    const updatedTasks = {
      ...teacherTasks,
      [source.droppableId]: sourceTasks,
    };
    
    if (source.droppableId !== destination.droppableId) {
      updatedTasks[destination.droppableId] = destTasks;
    }

    setTeacherTasks(updatedTasks);

    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/general/update_task.php", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          TaskID: parseInt(draggableId),
          ProjectID: project.ProjectID,
          Status: newStatus,
          UserID: userId
        })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error("Server returned invalid JSON");
      }

      if (result.status !== "success") {
        await fetchTasks();
        showCustomAlert("Failed to update task status. Please try again.", "error");
      } else {
        const updatedTaskFromServer = result.task;
        if (updatedTaskFromServer) {
          setTeacherTasks(prev => {
            const newTasks = { ...prev };
            Object.keys(newTasks).forEach(column => {
              newTasks[column] = newTasks[column].map(task => 
                task.id === draggableId 
                  ? { 
                      ...task, 
                      status: newStatus,
                      completedAt: updatedTaskFromServer.completed_at,
                      assigneeDetails: updatedTaskFromServer.AssignedTo || task.assigneeDetails,
                      rejectedUsers: (updatedTaskFromServer.AssignedTo || [])
                        .filter(user => user.is_rejected)
                        .map(user => user.UserID)
                    } 
                  : task
              );
            });
            return newTasks;
          });
        }
      }
    } catch (err) {
      console.error("Error updating task status:", err);
      await fetchTasks();
      showCustomAlert("Failed to update task status. Please refresh the page.", "error");
    }
  };

  const handleEditSave = async (updatedTask) => {
    setTeacherShowModal(false);
    
    if (updatedTask) {
      setTeacherTasks(prev => {
        const newTasks = { ...prev };
        Object.keys(newTasks).forEach(column => {
          newTasks[column] = newTasks[column].map(task => 
            task.id === updatedTask.id ? updatedTask : task
          );
        });
        return newTasks;
      });
    }
    
    await fetchTasks();
  };

  const handleAddSave = (newTask) => {
    const columnKey = statusToColumn[newTask.status] || "todo";
    setTeacherTasks(prev => ({
      ...prev,
      [columnKey]: [...(prev[columnKey] || []), newTask]
    }));
  };

  const totalTasks = Object.values(teacherTasks).flat().length;
  const completed = teacherTasks.done?.length || 0;
  const inProgress = teacherTasks.inprogress?.length || 0;
  const inReview = teacherTasks.review?.length || 0;
  const overdue = Object.values(teacherTasks).flat().filter(t => isOverdue(t.due)).length;

  const navPages = isArchived 
    ? ["overview", "Status Board", "settings"] 
    : ["overview", "Status Board", "activities", "settings"];

  const canAddTasks = currentUserRole === 'Host' || currentUserRole === 'Co-Host';

  if (loading) {
    return (
      <div className="teacher-pd-wrapper">
        <div className="teacher-pd-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
          <div>Loading tasks...</div>
        </div>
      </div>
    );
  }

  if (warning) {
    return (
      <div className="teacher-pd-wrapper">
        <div className="teacher-pd-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px', flexDirection: 'column' }}>
          <p className="teacher-input-warning" style={{ marginBottom: '20px' }}>⚠ {warning}</p>
          <button 
            className="teacher-btn teacher-save-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-pd-wrapper">
      {/* Custom Alert Popup */}
      {showAlertPopup && (
        <div className="modern-popup-overlay">
          <div className="modern-popup" style={{ maxWidth: "400px" }}>
            <div className={`modern-popup-header ${alertType}`} style={{
              background: alertType === "success" 
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : alertType === "error"
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : alertType === "warning"
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            }}>
              <h3>
                {alertType === "success" && "✓ Success"}
                {alertType === "error" && "✗ Error"}
                {alertType === "warning" && "⚠ Warning"}
                {alertType === "info" && "ℹ Information"}
              </h3>
            </div>
            <div className="modern-popup-content" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1rem", margin: "20px 0", color: "#374151" }}>
                {alertMessage}
              </p>
            </div>
            <div className="modern-popup-footer centered">
              <button 
                className="modern-btn modern-btn-primary" 
                onClick={() => setShowAlertPopup(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveConfirmModal && (
        <div className="teacher-modal-backdrop" onClick={() => setShowArchiveConfirmModal(false)}>
          <div className="tpd-invite-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="tpd-invite-modal-header">
              <h3 style={{ color: '#e15050' }}>📦 Archive Task</h3>
              <button className="tpd-close-btn" onClick={() => setShowArchiveConfirmModal(false)}>&times;</button>
            </div>
            <div className="tpd-invite-modal-body">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e15050" strokeWidth="1.5">
                  <path d="M21 8v13H3V8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 3H1v5h22V3z" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="10" y1="12" x2="14" y2="12" strokeLinecap="round"/>
                </svg>
              </div>
              
              <p style={{ textAlign: 'center', marginBottom: '10px', fontSize: '16px' }}>
                Are you sure you want to archive <strong>{archiveTaskName}</strong>?
              </p>
              <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                This task will be moved to the archived section and will no longer appear in the active task board.
                You can restore it later from the Activity Center.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  className="tpd-btn-outline"
                  onClick={() => setShowArchiveConfirmModal(false)}
                  disabled={archiving}
                >
                  Cancel
                </button>
                <button 
                  className="tpd-btn-outline-danger"
                  onClick={handleArchiveTask}
                  disabled={archiving}
                  style={{ background: '#e15050', color: 'white', border: 'none' }}
                >
                  {archiving ? "Archiving..." : "Confirm Archive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="teacher-pd-bg">
        <header className="teacher-pd-header">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="teacher-pd-title">
              {project?.ProjectName || "Project Title"} 
              {isArchived && <span style={{ marginLeft: '10px', fontSize: '14px', color: '#888', fontWeight: 'normal' }}>(Archived)</span>}
            </div>
            
            <nav className="teacher-pd-nav">
              {navPages.map(page => {
                const displayName = page.charAt(0).toUpperCase() + page.slice(1);
                let showBadge = false;
                let badgeCount = 0;
                let badgeColor = '';
                
                if (page === "activities" && !isArchived) {
                  if (notificationCounts.activities > 0) {
                    showBadge = true;
                    badgeCount = notificationCounts.activities;
                    badgeColor = '#20c5e0';
                  }
                } else if (page === "settings") {
                  const totalSettingsNotif = notificationCounts.settings + notificationCounts.members;
                  if (totalSettingsNotif > 0) {
                    showBadge = true;
                    badgeCount = totalSettingsNotif;
                    badgeColor = '#ff6a00';
                  }
                }
                
                return (
                  <a
                    key={page}
                    href="#"
                    className={`teacher-pd-nav-link ${teacherActivePage === page ? "active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setTeacherActivePage(page);
                    }}
                    style={{ position: 'relative' }}
                  >
                    {displayName}
                    {showBadge && (
                      <span 
                        className="nav-badge" 
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-12px',
                          backgroundColor: badgeColor,
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '20px',
                          minWidth: '18px',
                          textAlign: 'center',
                          animation: 'badgePulse 0.5s ease'
                        }}
                      >
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                    {showBadge && (
                      <span 
                        style={{
                          position: 'absolute',
                          top: '-12px',
                          right: '-20px',
                          fontSize: '14px',
                          animation: 'bounce 1s ease infinite'
                        }}
                      >
                        !
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
          </div>

          {teacherActivePage === "Status Board" && !isArchived && canAddTasks && (
            <button 
              className="teacher-btn teacher-add-task-btn" 
              onClick={() => setAddShowModal(true)}
            >
              Add Task
            </button>
          )}
          {teacherActivePage === "Status Board" && !isArchived && !canAddTasks && (
            <div style={{ color: '#888', fontSize: '14px' }}>👤 View-only mode (Host/Co-Host can add tasks)</div>
          )}
          {isArchived && teacherActivePage === "Status Board" && (
            <div style={{ color: '#888', fontSize: '14px' }}>🔒 Read-only mode</div>
          )}
        </header>

        <main className="tpd-main-content">
          {teacherActivePage === "overview" && (
            <OverviewPage
              project={project}
              teacherTasks={teacherTasks}
              totalTasks={totalTasks}
              completed={completed}
              inReview={inReview}
              inProgress={inProgress}
              overdue={overdue}
              onAddTask={() => setAddShowModal(true)}
              setTeacherActivePage={setTeacherActivePage}
              isArchived={isArchived}
            />
          )}

          {teacherActivePage === "Status Board" && (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="teacher-kanban-wrapper">
                <div className="teacher-kanban-container">
                  {teacherColumns.map(col => (
                    <Droppable droppableId={col.key} key={col.key}>
                      {(provided, snapshot) => {
                        const isDragActive = snapshot.isDraggingOver;
                        let canDropHere = false;
                        
                        if (isDragActive && snapshot.draggingOverWith) {
                          let draggedTask = null;
                          for (const column of Object.values(teacherTasks)) {
                            const found = column.find(task => task.id === snapshot.draggingOverWith);
                            if (found) {
                              draggedTask = found;
                              break;
                            }
                          }
                          if (draggedTask) {
                            canDropHere = canMoveToColumn(draggedTask, col.key);
                          }
                        }
                        
                        return (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`teacher-kanban-column ${isDragActive && canDropHere ? 'drag-over' : ''}`}
                            style={{ 
                              background: snapshot.isDraggingOver && !isArchived ? "#2a2a2a" : "#23242b",
                              border: isDragActive && canDropHere ? '2px solid #20c5e0' : 'none'
                            }}
                          >
                            <div style={{ color: col.color, fontWeight: 600, marginBottom: 12 }}>
                              {col.label} ({teacherTasks[col.key]?.length || 0})
                              {isDragActive && !canDropHere && snapshot.draggingOverWith && (
                                <span style={{ fontSize: '10px', marginLeft: '8px', color: '#e15050' }}>
                                  (Cannot drop here)
                                </span>
                              )}
                            </div>

                            {teacherTasks[col.key]?.map((task, idx) => {
                              const canDrag = canDragTask(task.id);
                              const overdueStatus = getOverdueStatus(task);
                              const isRejected = isTaskRejected(task);
                              const canMove = canMoveToColumn(task, col.key);
                              const isDraggableFromCurrent = canDrag && (task.status === "To Do" || task.status === "In Progress");
                              
                              let taskClassName = `teacher-kanban-task ${snapshot.isDragging ? "dragging" : ""}`;
                              
                              if (task.status === "Done") {
                                taskClassName += " done-task";
                              } else if (isRejected) {
                                taskClassName += " rejected-task";
                              }
                              
                              if (isArchived) {
                                taskClassName += " archived-task";
                              }
                              
                              if (!isDraggableFromCurrent || task.status === "For Review" || task.status === "Done") {
                                taskClassName += " non-draggable";
                              }
                              
                              return (
                                <Draggable 
                                  key={task.id} 
                                  draggableId={task.id} 
                                  index={idx}
                                  isDragDisabled={isArchived || !isDraggableFromCurrent}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={taskClassName}
                                      onClick={() => handleTaskClick(task)}
                                      style={{ 
                                        ...provided.draggableProps.style,
                                        cursor: isArchived ? 'default' : (isDraggableFromCurrent ? 'grab' : 'default'),
                                        opacity: isArchived ? 0.8 : 1
                                      }}
                                    >
                                      <div>{task.content}</div>
                                      <small style={{ opacity: 0.7 }}>
                                        Assigned: {getAssignedDisplay(task.assigned)}
                                      </small>
                                      {overdueStatus && !isRejected && (
                                        <span className={`overdue-badge ${overdueStatus === 'Late' ? 'late-badge' : ''}`}>
                                          {overdueStatus}!
                                        </span>
                                      )}
                                      {isRejected && task.status !== "Done" && task.status !== "For Review" && (
                                        <span className="rejected-badge">
                                          ❌ Rejected
                                        </span>
                                      )}
                                      {!isArchived && !isDraggableFromCurrent && task.status !== "To Do" && task.status !== "In Progress" && (
                                        <span className="lock-badge" style={{
                                          position: 'absolute',
                                          bottom: '4px',
                                          right: '8px',
                                          fontSize: '10px',
                                          opacity: 0.6
                                        }}>
                                          🔒
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}

                            {provided.placeholder}
                          </div>
                        );
                      }}
                    </Droppable>
                  ))}
                </div>
              </div>
            </DragDropContext>
          )}
          {teacherActivePage === "activities" && !isArchived && (
            <ActivitiesPage 
              projectId={project?.ProjectID} 
              isArchived={isArchived}
              onActivityClick={handleActivityClick}
              onRestoreTask={handleRestoreTask}
              onTaskClick={handleTaskClick}
            />
          )}
          
          {teacherActivePage === "settings" && (
            <SettingsPage 
              project={project} 
              settings={settings} 
              setSettings={setSettings}
              projectId={project?.ProjectID}
              setTeacherActivePage={setTeacherActivePage}
              isArchived={isArchived}
            />
          )}
        </main>

        {teacherShowModal && (
          <TeacherTaskDetailModal
            show={teacherShowModal}
            task={selectedTask}
            setTask={setSelectedTask}
            onClose={() => setTeacherShowModal(false)}
            onSave={handleEditSave}
            onArchiveTask={openArchiveConfirmModal}
            onRestoreTask={handleRestoreTask}
            projectMembers={projectMembers}
            isArchived={isArchived}
            currentUserRole={currentUserRole}
          />
        )}

        {addShowModal && (
          <AddTaskModal
            show={addShowModal}
            onClose={() => setAddShowModal(false)}
            onSave={handleAddSave}
            projectId={project?.ProjectID}
            projectName={project?.ProjectName || "SAMPLE PROJECT 1"}
            projectMembers={projectMembers}
            isArchived={isArchived}
            currentUserRole={currentUserRole}
          />
        )}

        {/* Activity Detail Modal */}
        {showActivityDetail && selectedActivity && (
          <div className="teacher-modal-backdrop" onClick={() => setShowActivityDetail(false)}>
            <div className="tpd-activity-detail-modal" onClick={e => e.stopPropagation()} style={{
              background: 'white',
              borderRadius: '16px',
              width: '500px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
              animation: 'modalSlideUp 0.3s ease'
            }}>
              <div className="tpd-activity-detail-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid #eee'
              }}>
                <div className="tpd-activity-detail-badge" style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  backgroundColor: selectedActivity.Action?.includes('Archived') ? '#e15050' :
                                  selectedActivity.Action?.includes('Restored') ? '#20c5e0' :
                                  selectedActivity.Action?.includes('Created') ? '#0ea5c7' :
                                  selectedActivity.Action?.includes('Updated') ? '#d97706' : '#555'
                }}>
                  {selectedActivity.Action || 'Activity'}
                </div>
                <button className="tpd-close-btn" onClick={() => setShowActivityDetail(false)} style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}>&times;</button>
              </div>

              <div className="tpd-activity-detail-body" style={{ padding: '24px' }}>
                <div className="tpd-activity-user-info" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '24px',
                  paddingBottom: '20px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <div className="tpd-activity-user-avatar large" style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: selectedActivity.UserRole === 'Host' ? '#1a1a2e' : 
                              selectedActivity.UserRole === 'Co-Host' ? '#20c5e0' : '#555',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 700
                  }}>
                    {selectedActivity.FirstName?.[0]}{selectedActivity.LastName?.[0]}
                  </div>
                  <div className="tpd-activity-user-details">
                    <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
                      {selectedActivity.UserName || `${selectedActivity.FirstName} ${selectedActivity.LastName}`}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="tpd-activity-user-email" style={{ fontSize: '13px', color: '#888' }}>
                        {selectedActivity.Email}
                      </span>
                      {selectedActivity.UserRole && (
                        <span className="tpd-role-badge" style={{ 
                          background: selectedActivity.UserRole === 'Host' ? '#1a1a2e' : 
                                      selectedActivity.UserRole === 'Co-Host' ? '#e8f8fb' : '#f0f0f3',
                          color: selectedActivity.UserRole === 'Host' ? '#fff' : 
                                selectedActivity.UserRole === 'Co-Host' ? '#0ea5c7' : '#555',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {selectedActivity.UserRole}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="tpd-activity-content" style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '24px',
                  padding: '20px',
                  background: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  <div className="tpd-activity-icon-large" style={{ fontSize: '32px', lineHeight: 1 }}>
                    {selectedActivity.Action?.includes('Archived') ? '📦' :
                    selectedActivity.Action?.includes('Restored') ? '♻️' :
                    selectedActivity.Action?.includes('Created') ? '📝' :
                    selectedActivity.Action?.includes('Updated') ? '🔄' : '📋'}
                  </div>
                  <div className="tpd-activity-text" style={{ flex: 1 }}>
                    <p className="tpd-activity-action" style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#1a1a2e',
                      margin: '0 0 8px'
                    }}>
                      {selectedActivity.Action}
                    </p>
                    <p className="tpd-activity-description" style={{
                      fontSize: '14px',
                      color: '#666',
                      margin: 0,
                      lineHeight: 1.5
                    }}>
                      {selectedActivity.Description}
                    </p>
                  </div>
                </div>

                <div className="tpd-activity-metadata" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px',
                  background: '#ffffff',
                  border: '1px solid #eee',
                  borderRadius: '8px'
                }}>
                  <div className="tpd-metadata-item" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span className="tpd-metadata-label" style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>Project</span>
                    <span className="tpd-metadata-value" style={{
                      fontSize: '13px',
                      color: '#1a1a2e',
                      fontWeight: 500
                    }}>{selectedActivity.ProjectName}</span>
                  </div>
                  <div className="tpd-metadata-item" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span className="tpd-metadata-label" style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>Date & Time</span>
                    <span className="tpd-metadata-value" style={{
                      fontSize: '13px',
                      color: '#1a1a2e',
                      fontWeight: 500
                    }}>{new Date(selectedActivity.LogDate).toLocaleDateString()} at {new Date(selectedActivity.LogDate).toLocaleTimeString()}</span>
                  </div>
                  <div className="tpd-metadata-item" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span className="tpd-metadata-label" style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>Time ago</span>
                    <span className="tpd-metadata-value" style={{
                      fontSize: '13px',
                      color: '#1a1a2e',
                      fontWeight: 500
                    }}>{selectedActivity.TimeAgo}</span>
                  </div>
                </div>

                {selectedActivity.Action?.includes('Archived task') && (
                  <div className="tpd-activity-warning" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginTop: '20px',
                    fontSize: '13px',
                    background: '#fde8e8',
                    color: '#e15050',
                    border: '1px solid #fecaca'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>This task has been archived and is no longer active.</span>
                  </div>
                )}

                {selectedActivity.Action?.includes('Restored task') && (
                  <div className="tpd-activity-success" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginTop: '20px',
                    fontSize: '13px',
                    background: '#e6f9ed',
                    color: '#2d9b53',
                    border: '1px solid #b8e6c9'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>This task has been restored and set to 'To Do' status.</span>
                  </div>
                )}
              </div>

              <div className="tpd-activity-detail-footer" style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '20px 24px',
                borderTop: '1px solid #eee'
              }}>
                <button className="tpd-btn-primary" onClick={() => setShowActivityDetail(false)} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  background: '#1a1a2e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeacherProjectDashboard;