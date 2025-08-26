// script-day.js — Day Shift Version (Full with PDF)

// ====== Global Variables ======
let students = {};
let reportVisible = false;
const STORAGE_KEY = 'day_students'; // isolate Day shift data

// ====== Helpers ======
function sanitizeId(name) {
  return String(name).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeJsString(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ====== LocalStorage Functions ======
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try { students = JSON.parse(data); } 
    catch (e) { console.warn('Error parsing students data, resetting.', e); students = {}; }
  }

  // normalize old/broken data
  for (const name of Object.keys(students)) {
    if (Array.isArray(students[name])) students[name] = { attendance: students[name], photo: "" };
    else if (!students[name] || typeof students[name] !== 'object') students[name] = { attendance: [], photo: "" };
    else {
      if (!Array.isArray(students[name].attendance)) students[name].attendance = [];
      if (!('photo' in students[name])) students[name].photo = "";
    }
  }

  document.getElementById("studentsSection").innerHTML = "";
  for (let name in students) renderStudent(name);
  saveData();
}

window.onload = loadData;

// ====== Add Student ======
function addStudent() {
  const name = document.getElementById("studentNameInput").value.trim();
  if (!name) return alert("Enter student name!");
  if (students[name]) return alert("Student already exists!");

  students[name] = { attendance: [], photo: "" };
  renderStudent(name);
  document.getElementById("studentNameInput").value = "";
  saveData();
}

// ====== Render Student ======
function renderStudent(name) {
  const id = sanitizeId(name);
  document.getElementById("student-" + id)?.remove();

  const div = document.createElement("div");
  div.className = "student-entry";
  div.id = "student-" + id;

  const photoSrc = students[name].photo || "";

  div.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <img src="${photoSrc}" alt="Photo" class="photo" id="photo-${id}" />
      <input type="file" id="file-${id}" accept="image/*" style="display:none" />
    </div>
    <p class="student-name"><b>Name:</b> ${escapeHtml(name)}</p>
    <div style="margin-top:8px;">
      <button class="present-btn" id="present-${id}">Present</button>
      <button class="absent-btn" id="absent-${id}">Absent</button>
      <button class="submit-btn" id="submit-${id}">Submit</button>
    </div>
  `;

  document.getElementById("studentsSection").appendChild(div);

  // Events
  const photoEl = document.getElementById("photo-" + id);
  const fileEl = document.getElementById("file-" + id);
  const presentBtn = document.getElementById("present-" + id);
  const absentBtn = document.getElementById("absent-" + id);
  const submitBtn = document.getElementById("submit-" + id);

  photoEl?.addEventListener("click", () => fileEl.click());
  fileEl?.addEventListener("change", (e) => previewPhoto(e, name));
  presentBtn?.addEventListener("click", () => markAttendance(name,'present'));
  absentBtn?.addEventListener("click", () => markAttendance(name,'absent'));
  submitBtn?.addEventListener("click", () => submitAttendance(name));
}

// ====== Photo Preview ======
function previewPhoto(event, name) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    const img = document.getElementById("photo-" + sanitizeId(name));
    if (img) img.src = dataUrl;
    students[name].photo = dataUrl;
    saveData();
  };
  reader.readAsDataURL(file);
}

// ====== Attendance Functions ======
function markAttendance(name, status) {
  const id = sanitizeId(name);
  const presentBtn = document.getElementById("present-" + id);
  const absentBtn = document.getElementById("absent-" + id);

  presentBtn && (presentBtn.style.background = status==='present'?'green':'lightgray', presentBtn.style.color=status==='present'?'white':'black');
  absentBtn && (absentBtn.style.background = status==='absent'?'red':'lightgray', absentBtn.style.color=status==='absent'?'white':'black');

  students[name].tempStatus = status;
  saveData();
}

function submitAttendance(name) {
  if (!students[name]?.tempStatus) return alert("Select Present or Absent before submitting!");

  const now = new Date();
  const todayStr = now.toLocaleDateString();
  const status = students[name].tempStatus;

  let penalty = 0;
  let arriveStatus = "On Time";

  if (status === "present") {
    // Day shift starts at 17:00 (5 PM)
    const startHour = 17, startMinute = 0;
    const lateMinutes = (now.getHours() - startHour) * 60 + (now.getMinutes() - startMinute);

    if (lateMinutes <= 0) {
      penalty = 0;
      arriveStatus = "On Time";
    } else if (lateMinutes <= 5) {
      penalty = -0.05;
      arriveStatus = `${lateMinutes} min late`;
    } else if (lateMinutes <= 10) {
      penalty = -0.10;
      arriveStatus = `${lateMinutes} min late`;
    } else if (lateMinutes <= 15) {
      penalty = -0.15;
      arriveStatus = `${lateMinutes} min late`;
    } else if (lateMinutes <= 20) {
      penalty = -0.20;
      arriveStatus = `${lateMinutes} min late`;
    } else if (lateMinutes <= 25) {
      penalty = -0.25;
      arriveStatus = `${lateMinutes} min late`;
    } else {
      penalty = -0.30;
      arriveStatus = `${lateMinutes} min late`;
    }
  } else {
    arriveStatus = "Absent";
    penalty = 0;
  }

  // Keep only last 30 days
  students[name].attendance = (students[name].attendance || []).filter(r => {
    const recordDate = new Date(r.date);
    const diffDays = (now - recordDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  });

  students[name].attendance.push({
    date: todayStr,
    status,
    penalty,
    arrive: arriveStatus
  });

  delete students[name].tempStatus;

  // Reset buttons
  const id = sanitizeId(name);
  ['present','absent'].forEach(type => {
    const btn = document.getElementById(`${type}-${id}`);
    if (btn) { btn.style.background='lightgray'; btn.style.color='black'; }
  });

  saveData();
  alert(`Attendance saved for ${name}`);
}

// ====== Report Section ======
function toggleReport() {
  reportVisible = !reportVisible;
  document.getElementById("reportSection").style.display = reportVisible?'block':'none';
  reportVisible && renderReport();
}

function renderReport() {
  const report = document.getElementById("reportSection");
  report.innerHTML = "";

  for (let name in students) {
    const div = document.createElement("div");
    div.className = "student-entry";

    let attendanceList = students[name].attendance||[];
    let rows = attendanceList.map(r=>{
      return `<tr>
        <td>${r.date}</td>
        <td>${r.arrive}</td>
        <td>${r.status==='present'?'✅':''}</td>
        <td>${r.penalty<0?r.penalty.toFixed(2):'0'}</td>
        <td>${r.status==='absent'?'❌':''}</td>
      </tr>`;
    }).join("");

    const totalPresent = attendanceList.filter(r=>r.status==='present').length;
    const totalAbsent = attendanceList.filter(r=>r.status==='absent').length;
    const totalPenalty = attendanceList.reduce((sum,r)=>sum+(r.penalty||0),0);

    rows += `<tr style="font-weight:bold; background:#eee;">
      <td>Total</td><td>-</td><td>${totalPresent}</td><td>${totalPenalty.toFixed(2)}</td><td>${totalAbsent}</td>
    </tr>`;

    div.innerHTML = `
      <button onclick="toggleStudentTable('${escapeJsString(name)}')">${escapeHtml(name)}</button>
      <button onclick="deleteStudent('${escapeJsString(name)}')">Delete</button>
      <div id="table-${sanitizeId(name)}" style="display:none;">
        <table>
          <tr><th>Date</th><th>Arrive</th><th>Present</th><th>Late</th><th>Absent</th></tr>
          ${rows||"<tr><td colspan='5'>No data</td></tr>"}
        </table>
        <div style="margin-top:10px; display:flex; justify-content: space-between;">
          <button style="background:#6c757d;color:white;padding:5px 10px;border-radius:5px;"
            onclick="toggleStudentTable('${escapeJsString(name)}')">Back</button>
          <button style="background:#007bff;color:white;padding:5px 10px;border-radius:5px;"
            onclick="endMonthTeacher('${escapeJsString(name)}')">End Month</button>
        </div>
      </div>
    `;
    report.appendChild(div);
  }
}

function toggleStudentTable(name) {
  const table = document.getElementById("table-" + sanitizeId(name));
  if (table) table.style.display = table.style.display==='none'?'block':'none';
}

function deleteStudent(name) {
  if (!confirm(`Are you sure you want to delete all records of ${name}?`)) return;
  delete students[name];
  document.getElementById("student-" + sanitizeId(name))?.remove();
  saveData();
  renderReport();
}

// ====== End Month & PDF ======
function endMonthTeacher(name) {
  if (!confirm(`Generate PDF and optionally clear table data for ${name}?`)) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const attendanceList = students[name]?.attendance||[];

  doc.setFontSize(14);
  doc.text(`Teacher: ${name}`, 10, 10);

  if (attendanceList.length===0) doc.text("No data available",10,20);
  else {
     const rows = attendanceList.map(r => {
      const penalty = typeof r.penalty === 'number' ? r.penalty : 0;
      const arrive = r.arrive || (r.status === "absent" ? "Absent" : "On Time");

      return [
        r.date || "-",
        arrive,
        r.status === "present" ? "P" : "",
        penalty.toFixed(2),
        r.status === "absent" ? "A" : ""
      ];
    });

    const totalPresent = attendanceList.filter(r=>r.status==='present').length;
    const totalAbsent = attendanceList.filter(r=>r.status==='absent').length;
    const totalPenalty = attendanceList.reduce((sum,r)=>sum+(r.penalty||0),0);
    rows.push(["Total","-",totalPresent,totalPenalty.toFixed(2),totalAbsent]);

    doc.autoTable({
      startY:20,
      head:[['Date','Arrive','Present','Late','Absent']],
      body:rows,
      theme:'grid',
      headStyles:{fillColor:[89,228,73],textColor:0,halign:'center'},
      bodyStyles:{textColor:0,halign:'center'},
      alternateRowStyles:{fillColor:[245,245,245]}
    });
  }

  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.location.href = url;

  if (confirm("Do you want to clear table data after generating PDF?")) {
    students[name].attendance=[];
    saveData();
    renderReport();
    alert(`Table data for ${name} cleared!`);
  }
}