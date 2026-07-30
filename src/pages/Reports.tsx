import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Project, User } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { FileText, Download, Printer, TrendingUp, AlertCircle, BarChart2 } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';

export const Reports: React.FC = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      const res = await fetch('/api/reports/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setProjects(Array.isArray(data.projects) ? data.projects : []);
        setPieData(Array.isArray(data.pieData) ? data.pieData : []);
        setTeamPerformance(Array.isArray(data.teamPerformance) ? data.teamPerformance : []);
        if (Array.isArray(data.trendData)) {
          setTrendData(data.trendData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'pdf' | 'excel' | 'print', project?: any) => {
    if (type === 'excel') {
      const wb = XLSX.utils.book_new();
      
      if (!project) {
        // FULL REPORT EXPORT
        
        // 1. Task Completion Overview
        const pieHeaders = ["Status", "Percentage"];
        const pieRows = pieData.length > 0 ? pieData.map(d => ({
          "Status": d.name,
          "Percentage": d.value + "%"
        })) : [{}];
        const wsPie = XLSX.utils.json_to_sheet(pieRows, { header: pieHeaders });
        XLSX.utils.book_append_sheet(wb, wsPie, "Task Completion");
        
        // 2. Team Performance
        const teamHeaders = ["Team Member", "Total Tasks", "Completion Rate"];
        const teamRows = teamPerformance.length > 0 ? teamPerformance.map(t => ({
          "Team Member": t.name,
          "Total Tasks": t.assigned,
          "Completion Rate": t.rate
        })) : [{}];
        const wsTeam = XLSX.utils.json_to_sheet(teamRows, { header: teamHeaders });
        XLSX.utils.book_append_sheet(wb, wsTeam, "Team Performance");
        
        // 3. Monthly Trend
        const trendHeaders = ["Month", "Created Tasks", "Completed Tasks"];
        const trendRows = trendData.length > 0 ? trendData.map(t => ({
          "Month": t.name,
          "Created Tasks": t.Created,
          "Completed Tasks": t.Completed
        })) : [{}];
        const wsTrend = XLSX.utils.json_to_sheet(trendRows, { header: trendHeaders });
        XLSX.utils.book_append_sheet(wb, wsTrend, "Monthly Trend");
        
        // 4. Project Summary
        const projHeaders = ["Project Name", "Progress", "Status", "Client", "Lead", "Deadline", "Overdue Tasks", "Description"];
        const projRows = projects.length > 0 ? projects.map(p => ({
          "Project Name": p.name || 'Untitled',
          "Progress": (p.progress || 0) + "%",
          "Status": p.status || 'N/A',
          "Client": p.client || 'N/A',
          "Lead": p.lead || 'N/A',
          "Deadline": p.endDate || 'No deadline',
          "Overdue Tasks": p._overdueCount || 0,
          "Description": p.description || ''
        })) : [{}];
        const wsProjects = XLSX.utils.json_to_sheet(projRows, { header: projHeaders });
        XLSX.utils.book_append_sheet(wb, wsProjects, "Project Summary");
        
        // 5. All Tasks
        const allTasks: any[] = [];
        projects.forEach(p => {
          if (p.tasks && Array.isArray(p.tasks)) {
            p.tasks.forEach((t: any) => {
              allTasks.push({
                "Project": p.name || 'Untitled',
                "Task Name": t.name || 'Untitled',
                "Priority": t.priority || 'N/A',
                "Status": t.status || 'N/A',
                "Due Date": t.dueDate || 'N/A'
              });
            });
          }
        });
        const taskHeaders = ["Project", "Task Name", "Priority", "Status", "Due Date"];
        const taskRows = allTasks.length > 0 ? allTasks : [{}];
        const wsTasks = XLSX.utils.json_to_sheet(taskRows, { header: taskHeaders });
        XLSX.utils.book_append_sheet(wb, wsTasks, "All Tasks");
        
        XLSX.writeFile(wb, "Comprehensive_Dashboard_Report.xlsx");
        
      } else {
        // SINGLE PROJECT EXPORT
        const wsProject = XLSX.utils.json_to_sheet([{
          "Project Name": project.name || 'Untitled',
          "Progress": (project.progress || 0) + "%",
          "Status": project.status || 'N/A',
          "Client": project.client || 'N/A',
          "Lead": project.lead || 'N/A',
          "Start Date": project.startDate || 'N/A',
          "Deadline": project.endDate || 'No deadline',
          "Overdue Tasks": project._overdueCount || 0,
          "Description": project.description || ''
        }]);
        XLSX.utils.book_append_sheet(wb, wsProject, "Project Details");
        
        const singleTaskHeaders = ["Task Name", "Priority", "Status", "Due Date"];
        const singleTaskRows = (project.tasks && Array.isArray(project.tasks) && project.tasks.length > 0) 
          ? project.tasks.map((t: any) => ({
              "Task Name": t.name || 'Untitled',
              "Priority": t.priority || 'N/A',
              "Status": t.status || 'N/A',
              "Due Date": t.dueDate || 'N/A'
            }))
          : [{}];
        const wsSingleTasks = XLSX.utils.json_to_sheet(singleTaskRows, { header: singleTaskHeaders });
        XLSX.utils.book_append_sheet(wb, wsSingleTasks, "Project Tasks");
        
        XLSX.writeFile(wb, `Project_${project.id}_Detailed_Report.xlsx`);
      }

    } else if (type === 'pdf') {
      try {
        const doc = new jsPDF();
        
        if (!project) {
          // FULL REPORT EXPORT WITH NATIVE JSPDF & AUTOTABLE + SNAPSHOT OF GRAPHS
          doc.setFontSize(22);
          doc.text("Comprehensive Dashboard Report", 14, 22);
          
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139); // slate-500
          doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
          
          let currentY = 40;
          
          // Helper to check page break
          const checkPageBreak = (neededHeight: number) => {
            if (currentY + neededHeight > doc.internal.pageSize.getHeight() - 15) {
              doc.addPage();
              currentY = 20;
            }
          };
          
          // 1. Capture and add Charts
          const chartsElement = document.getElementById('charts-container');
          if (chartsElement) {
            const originalStyle = chartsElement.style.cssText;
            
            // Force temporary layout for better capture if needed, though html-to-image is usually okay
            const imgData = await toPng(chartsElement, { 
              cacheBust: true, 
              backgroundColor: '#ffffff',
              pixelRatio: 2
            });
            
            const img = new Image();
            img.src = imgData;
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });
            
            const pdfWidth = doc.internal.pageSize.getWidth() - 28; // 14px margin on each side
            const pdfHeight = (img.height * pdfWidth) / img.width;
            
            checkPageBreak(pdfHeight + 10);
            doc.addImage(imgData, 'PNG', 14, currentY, pdfWidth, pdfHeight);
            currentY += pdfHeight + 15;
          }
          
          // 2. Task Completion Table
          if (pieData && pieData.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text("Task Completion Overview", 14, currentY);
            currentY += 6;
            
            const pieColumn = ["Status", "Percentage"];
            const pieRows = pieData.map((d: any) => [d.name, d.value + "%"]);
            
            autoTable(doc, {
              head: [pieColumn],
              body: pieRows,
              startY: currentY,
              theme: 'grid',
              styles: { fontSize: 10, cellPadding: 5 },
              headStyles: { fillColor: [59, 130, 246] }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
          }
          
          // 3. Monthly Trend Table
          if (trendData && trendData.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text("Monthly Tasks Trend", 14, currentY);
            currentY += 6;
            
            const trendColumn = ["Month", "Created Tasks", "Completed Tasks"];
            const trendRows = trendData.map((t: any) => [t.name, t.Created, t.Completed]);
            
            autoTable(doc, {
              head: [trendColumn],
              body: trendRows,
              startY: currentY,
              theme: 'grid',
              styles: { fontSize: 10, cellPadding: 5 },
              headStyles: { fillColor: [14, 165, 233] }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
          }
          
          // 4. Team Performance Table
          if (teamPerformance && teamPerformance.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text("Team Performance", 14, currentY);
            currentY += 6;
            
            const teamColumn = ["Team Member", "Total Tasks", "Completion Rate"];
            const teamRows = teamPerformance.map((t: any) => [
              t.name,
              t.assigned,
              t.rate
            ]);
            
            autoTable(doc, {
              head: [teamColumn],
              body: teamRows,
              startY: currentY,
              theme: 'grid',
              styles: { fontSize: 10, cellPadding: 5 },
              headStyles: { fillColor: [16, 185, 129] }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
          }
          
          // 5. Project Summary Table
          if (projects && projects.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text("Project Summary", 14, currentY);
            currentY += 6;
            
            const projColumn = ["Project Name", "Progress", "Status", "Client", "Deadline", "Overdue"];
            const projRows = projects.map((p: any) => [
              p.name || 'Untitled',
              (p.progress || 0) + '%',
              p.status || 'N/A',
              p.client || 'N/A',
              p.endDate || 'N/A',
              p.dueDate || p._overdueCount || '0'
            ]);
            
            autoTable(doc, {
              head: [projColumn],
              body: projRows,
              startY: currentY,
              theme: 'grid',
              styles: { fontSize: 10, cellPadding: 5 },
              headStyles: { fillColor: [99, 102, 241] }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
          }
          
          // 6. All Tasks Table
          const allTasks: any[] = [];
          projects.forEach(p => {
            if (p.tasks && Array.isArray(p.tasks)) {
              p.tasks.forEach((t: any) => {
                allTasks.push({
                  projectName: p.name || 'Untitled',
                  taskName: t.name || 'Untitled',
                  priority: t.priority || 'N/A',
                  status: t.status || 'N/A',
                  dueDate: t.dueDate || 'N/A'
                });
              });
            }
          });
          
          if (allTasks.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text("All Tasks Detail", 14, currentY);
            currentY += 6;
            
            const taskColumn = ["Project", "Task Name", "Priority", "Status", "Due Date"];
            const taskRows = allTasks.map((t: any) => [
              t.projectName,
              t.taskName,
              t.priority,
              t.status,
              t.dueDate
            ]);
            
            autoTable(doc, {
              head: [taskColumn],
              body: taskRows,
              startY: currentY,
              theme: 'grid',
              styles: { fontSize: 9, cellPadding: 4 },
              headStyles: { fillColor: [100, 116, 139] }
            });
          }
          
          doc.save("Detailed_Dashboard_Report.pdf");
        } else {
          // SINGLE PROJECT REPORT EXPORT
          doc.setFontSize(18);
          doc.text("Project Detailed Report", 14, 22);
          
          doc.setFontSize(11);
          doc.text(`Project Name: ${project.name || 'Untitled'}`, 14, 32);
          doc.text(`Progress: ${project.progress || 0}%`, 14, 40);
          doc.text(`Status: ${project.status || 'N/A'}`, 14, 48);
          doc.text(`Client: ${project.client || 'N/A'}`, 14, 56);
          doc.text(`Lead: ${project.lead || 'N/A'}`, 14, 64);
          doc.text(`Start Date: ${project.startDate || 'N/A'}`, 14, 72);
          doc.text(`End Date: ${project.endDate || 'N/A'}`, 14, 80);
          doc.text(`Overdue Tasks: ${project._overdueCount || '0'}`, 14, 88);
          doc.text(`Description:`, 14, 96);
          
          doc.setFontSize(10);
          const splitDesc = doc.splitTextToSize(project.description || 'No description provided.', 180);
          doc.text(splitDesc, 14, 104);
          
          if (project.tasks && Array.isArray(project.tasks) && project.tasks.length > 0) {
            doc.setFontSize(14);
            doc.text("Project Tasks", 14, 104 + (splitDesc.length * 5) + 10);
            
            const taskColumn = ["Task Name", "Priority", "Status", "Due Date"];
            const taskRows = project.tasks.map((t: any) => [
              t.name || 'Untitled',
              t.priority || 'N/A',
              t.status || 'N/A',
              t.dueDate || 'N/A'
            ]);
            
            autoTable(doc, {
              head: [taskColumn],
              body: taskRows,
              startY: 104 + (splitDesc.length * 5) + 15,
              theme: 'grid',
              styles: { fontSize: 9 },
              headStyles: { fillColor: [100, 116, 139] }
            });
          }
          
          doc.save(`Project_${project.id}_Detailed_Report.pdf`);
        }
      } catch (err: any) {
        console.error("PDF EXPORT ERROR:", err);
        alert("PDF Error: " + err.message);
      }
    }
  };

  return (
    <div id="report-container" className="flex flex-col gap-6 animate-fadeIn">
      
      {/* Page Title & Exports matching Page 15/29 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="font-sans font-black text-2xl tracking-tight text-slate-800 leading-none">REPORTS</h1>
          <p className="font-sans text-xs text-slate-400 mt-1.5 font-medium uppercase tracking-wider">Generate, view, and export newsroom and employee metrics summaries.</p>
        </div>

        <div id="export-buttons" className="flex items-center gap-2 self-start sm:self-center print:hidden relative">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-sans font-bold px-3.5 py-2 rounded-lg transition-all"
          >
            <FileText className="w-4 h-4 text-red-500" /> Export PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-sans font-bold px-3.5 py-2 rounded-lg transition-all"
          >
            <FileText className="w-4 h-4 text-emerald-500" /> Export Excel
          </button>
        </div>
      </div>

      {/* Grid of widgets matching Page 29 visual composition */}
      <div id="charts-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Task Completion Overview Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <h2 className="font-sans font-bold text-sm text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-blue-500" /> Task Completion Overview
          </h2>
          
          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center percentage summary text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="font-sans font-black text-2xl text-slate-800">
                {pieData.find(d => d.name === 'Completed')?.value || 0}%
              </span>
              <span className="text-[9px] font-sans text-slate-400 font-bold uppercase tracking-wider">Completed</span>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 border-t border-slate-50 pt-3">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex flex-col items-center">
                <span className="text-[10px] font-sans font-bold text-slate-400 uppercase">{entry.name}</span>
                <span className="font-sans font-black text-sm text-slate-800">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* My Team Performance bar matrix */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <h2 className="font-sans font-bold text-sm text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Team Performance
          </h2>
          <div className="flex flex-col gap-3">
            {teamPerformance.map((member) => (
              <div key={member.name} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-sans font-bold text-slate-700">{member.name}</span>
                  <span className="font-sans text-slate-500">Tasks: {member.assigned} ({member.rate})</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${
                    parseFloat(member.rate) >= 80 ? 'bg-emerald-500' :
                    parseFloat(member.rate) >= 50 ? 'bg-[#00adef]' :
                    parseFloat(member.rate) >= 20 ? 'bg-amber-500' :
                    'bg-slate-300'
                  }`} style={{ width: member.rate }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Completion Trend Line Graph */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <h2 className="font-sans font-bold text-sm text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-sky-500" /> Monthly Tasks Trend
          </h2>
          
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" interval={0} tick={{ fontSize: 10, fill: '#94a3b8' }}  />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }}  />
                <Tooltip />
                <Line type="monotone" dataKey="Completed" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Created" stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Project Summary matrix matching Page 15/29 exactly */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-sans font-bold text-sm text-slate-700 uppercase tracking-wider">Project Summary Status</h2>
        </div>
        
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[35%] rounded-tl-2xl">Project Name</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[20%]">Progress</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[15%] hidden sm:table-cell">Deadline</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider w-[15%] hidden md:table-cell">Tasks Overdue</th>
              <th className="py-4 px-4 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-center w-[15%] rounded-tr-2xl print:hidden">Report</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-slate-400 bg-white">Syncing records...</td>
              </tr>
            ) : (Array.isArray(projects) ? projects : []).map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all bg-white">
                <td className="py-4 px-4 font-sans font-bold text-[10px] sm:text-xs text-slate-800 truncate">{p.name}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3 w-36">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        p.progress >= 100 ? 'bg-emerald-500' :
                        p.progress >= 60 ? 'bg-[#00adef]' :
                        p.progress >= 30 ? 'bg-amber-500' :
                        'bg-slate-300'
                      }`} style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="font-sans text-[11px] font-bold text-slate-600">{p.progress}%</span>
                  </div>
                </td>
                <td className="py-4 px-6 font-sans text-xs text-slate-500 font-medium">{p.endDate}</td>
                <td className="py-4 px-6 font-sans text-xs font-medium text-red-500">
                  {p._overdueCount > 0 ? `${p._overdueCount} Overdue` : <span className="text-slate-400">None</span>}
                </td>
                <td className="py-4 px-4 text-center print:hidden">
                  <button
                    onClick={() => handleExport('pdf', p)}
                    className="print:hidden flex items-center gap-1 mx-auto bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-sans font-black uppercase px-2.5 py-1.5 rounded-lg"
                  >
                    <Download className="w-3 h-3 text-blue-500" /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
