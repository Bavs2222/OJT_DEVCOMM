/**
 * OJT-TS — On-the-Job Training Tracking System
 * app.js — All application logic
 * Architecture: IIFE namespace (window.OJT)
 * Storage: localStorage only (MVP)
 */

window.OJT = (function () {

  // =============================================
  //  CONSTANTS & MOCK DATA
  // =============================================

  /**
   * Mock user accounts (simulated "database")
   * In a real app these would live on a server.
   */
  const MOCK_USERS = [
    {
      id: 's001',
      username: 'student1',
      password: 'pass123',
      role: 'student',
      name: 'Maria Santos',
      studentId: '2021-00101',
      company: 'TechSolutions Inc.',
      requiredHours: 600
    },
    {
      id: 's002',
      username: 'student2',
      password: 'pass123',
      role: 'student',
      name: 'Juan dela Cruz',
      studentId: '2021-00102',
      company: 'DataBridge Corp.',
      requiredHours: 600
    },
    {
      id: 's003',
      username: 'student3',
      password: 'pass123',
      role: 'student',
      name: 'Ana Reyes',
      studentId: '2021-00103',
      company: 'CloudWave Ltd.',
      requiredHours: 600
    },
    {
      id: 'a001',
      username: 'adviser1',
      password: 'adv456',
      role: 'adviser',
      name: 'Prof. Elena Torres',
      department: 'College of IT'
    }
  ];

  /**
   * Simulated company area for location check.
   * Students within ~5km radius of this point are "inside".
   */
  const COMPANY_AREA = {
    lat: 14.5995,
    lng: 120.9842,
    radiusKm: 5
  };

  // Storage key prefixes
  const KEY_DTR       = 'ojt_dtr_';       // + studentId
  const KEY_EMERGENCY = 'ojt_emergency';  // single array
  const KEY_SESSION   = 'ojt_session';

  // =============================================
  //  AUTHENTICATION
  // =============================================

  /**
   * Authenticate a user by username + password + role.
   * Returns the user object (minus password) or null.
   */
  function authenticate(username, password, role) {
    const user = MOCK_USERS.find(
      u => u.username === username && u.password === password && u.role === role
    );
    if (!user) return null;
    // Strip password before storing in session
    const { password: _pw, ...safe } = user;
    return safe;
  }

  /**
   * Log out — clear session and redirect to landing.
   */
  function logout() {
    localStorage.removeItem(KEY_SESSION);
    window.location.href = 'index.html';
  }

  // =============================================
  //  DTR (Daily Time Record) HELPERS
  // =============================================

  /** Get all DTR records for a student */
  function getDTR(studentId) {
    const raw = localStorage.getItem(KEY_DTR + studentId);
    return raw ? JSON.parse(raw) : [];
  }

  /** Save DTR records for a student */
  function saveDTR(studentId, records) {
    localStorage.setItem(KEY_DTR + studentId, JSON.stringify(records));
  }

  /** Get today's date string YYYY-MM-DD */
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  /** Format a Date to HH:MM:SS AM/PM */
  function formatTime(isoStr) {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  /** Format a Date to readable date string */
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /** Calculate hours between two ISO strings */
  function calcHours(timeIn, timeOut) {
    if (!timeIn || !timeOut) return null;
    const diff = (new Date(timeOut) - new Date(timeIn)) / 3600000;
    return Math.max(0, diff).toFixed(2);
  }

  /** Sum all complete hours for a student */
  function totalHours(studentId) {
    const records = getDTR(studentId);
    return records.reduce((acc, r) => {
      const h = calcHours(r.timeIn, r.timeOut);
      return acc + (h ? parseFloat(h) : 0);
    }, 0).toFixed(2);
  }

  /** Get today's DTR record for a student */
  function getTodayRecord(studentId) {
    const records = getDTR(studentId);
    return records.find(r => r.date === todayStr()) || null;
  }

  // =============================================
  //  TIME IN / TIME OUT
  // =============================================

  /**
   * Time In — creates a new DTR entry for today.
   */
  function timeIn() {
    const sess = JSON.parse(localStorage.getItem(KEY_SESSION));
    if (!sess) return;

    const records = getDTR(sess.id);
    const existing = records.find(r => r.date === todayStr());

    if (existing && existing.timeIn) {
      alert('You have already timed in today!');
      return;
    }

    const now = new Date().toISOString();
    if (existing) {
      existing.timeIn = now;
    } else {
      records.push({
        id: Date.now(),
        studentId: sess.id,
        studentName: sess.name,
        date: todayStr(),
        timeIn: now,
        timeOut: null,
        status: 'Incomplete'
      });
    }

    saveDTR(sess.id, records);
    renderStudentDashboard(sess);
  }

  /**
   * Time Out — updates the existing DTR entry.
   */
  function timeOut() {
    const sess = JSON.parse(localStorage.getItem(KEY_SESSION));
    if (!sess) return;

    const records = getDTR(sess.id);
    const today = records.find(r => r.date === todayStr());

    if (!today || !today.timeIn) {
      alert('You have not timed in yet today.');
      return;
    }
    if (today.timeOut) {
      alert('You have already timed out today.');
      return;
    }

    today.timeOut = new Date().toISOString();
    today.status = 'Complete';

    saveDTR(sess.id, records);
    renderStudentDashboard(sess);
  }

  // =============================================
  //  STUDENT DASHBOARD RENDERER
  // =============================================

  function renderStudentDashboard(sess) {
    const records = getDTR(sess.id);
    const todayRec = getTodayRecord(sess.id);
    const total = totalHours(sess.id);
    const complete = records.filter(r => r.status === 'Complete').length;

    // --- Stat cards ---
    setEl('totalHours',   total + 'h');
    setEl('daysPresent',  complete);

    // Today status
    let statusText = 'Not Started';
    if (todayRec && todayRec.timeIn && !todayRec.timeOut) statusText = 'Timed In';
    if (todayRec && todayRec.timeOut) statusText = 'Complete';
    setEl('statusText', statusText);

    // User badge
    const badge = document.getElementById('userBadge');
    if (badge) {
      if (todayRec && todayRec.timeIn && !todayRec.timeOut) {
        badge.textContent = 'Active';
        badge.className = 'badge badge-active';
      } else {
        badge.textContent = 'Inactive';
        badge.className = 'badge badge-inactive';
      }
    }

    // --- Time In/Out buttons ---
    const btnIn  = document.getElementById('btnTimeIn');
    const btnOut = document.getElementById('btnTimeOut');
    if (btnIn && btnOut) {
      if (!todayRec || !todayRec.timeIn) {
        // Not timed in yet
        btnIn.disabled  = false;
        btnOut.disabled = true;
      } else if (todayRec.timeIn && !todayRec.timeOut) {
        // Currently timed in
        btnIn.disabled  = true;
        btnOut.disabled = false;
      } else {
        // Already timed out
        btnIn.disabled  = true;
        btnOut.disabled = true;
      }
    }

    // --- Today's record display ---
    const todayBox = document.getElementById('todayRecord');
    if (todayBox && todayRec) {
      todayBox.classList.remove('hidden');
      setEl('trDate',   formatDate(todayRec.date));
      setEl('trIn',     formatTime(todayRec.timeIn));
      setEl('trOut',    formatTime(todayRec.timeOut));
      const statusBadge = todayRec.status === 'Complete'
        ? '<span class="badge badge-active">Complete</span>'
        : '<span class="badge badge-inactive">Incomplete</span>';
      const el = document.getElementById('trStatus');
      if (el) el.innerHTML = statusBadge;
    }

    // --- DTR Table ---
    renderDTRTable('dtrTableBody', records, false);

    // --- My Emergency Table ---
    renderMyEmergencyTable(sess.id);
  }

  function renderDTRTable(tbodyId, records, showStudent) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${showStudent ? 6 : 6}" class="empty-row">No records found.</td></tr>`;
      return;
    }

    // Sort newest first
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

    tbody.innerHTML = sorted.map((r, i) => {
      const hrs   = calcHours(r.timeIn, r.timeOut);
      const badge = r.status === 'Complete'
        ? '<span class="badge badge-active">Complete</span>'
        : '<span class="badge badge-inactive">Incomplete</span>';

      if (showStudent) {
        return `<tr>
          <td>${r.studentName || '—'}</td>
          <td>${formatDate(r.date)}</td>
          <td>${formatTime(r.timeIn)}</td>
          <td>${formatTime(r.timeOut)}</td>
          <td>${hrs ? hrs + 'h' : '—'}</td>
          <td>${badge}</td>
        </tr>`;
      } else {
        return `<tr>
          <td>${sorted.length - i}</td>
          <td>${formatDate(r.date)}</td>
          <td>${formatTime(r.timeIn)}</td>
          <td>${formatTime(r.timeOut)}</td>
          <td>${hrs ? hrs + 'h' : '—'}</td>
          <td>${badge}</td>
        </tr>`;
      }
    }).join('');
  }

  // =============================================
  //  LOCATION CHECK
  // =============================================

  /**
   * Haversine formula to compute distance (km) between two lat/lng points.
   */
  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Prompt for geolocation, display result, update status.
   */
  function checkLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    const btn = document.querySelector('.btn-location');
    if (btn) { btn.textContent = 'Locating…'; btn.disabled = true; }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const distKm = haversineKm(latitude, longitude, COMPANY_AREA.lat, COMPANY_AREA.lng);
        const inside = distKm <= COMPANY_AREA.radiusKm;

        // Display results
        const res = document.getElementById('locationResult');
        if (res) res.classList.remove('hidden');

        setEl('locLat', latitude.toFixed(6));
        setEl('locLng', longitude.toFixed(6));
        setEl('locStatus', inside
          ? '✅ Inside Company Area'
          : '🔴 Outside Company Area');
        setEl('locParticipation', inside
          ? '✅ Participating'
          : '⚠ Not Participating');

        // Update location card on overview
        setEl('locationBadgeCard', inside ? 'Inside' : 'Outside');

        // Save location check to session
        const sess = JSON.parse(localStorage.getItem(KEY_SESSION));
        if (sess) {
          sess.lastLocation = { latitude, longitude, inside, checkedAt: new Date().toISOString() };
          localStorage.setItem(KEY_SESSION, JSON.stringify(sess));
        }

        if (btn) { btn.textContent = 'Share Location'; btn.disabled = false; }
      },
      err => {
        // Simulate a location for demo if user denies permission
        const simLat = COMPANY_AREA.lat + (Math.random() * 0.08 - 0.04);
        const simLng = COMPANY_AREA.lng + (Math.random() * 0.08 - 0.04);
        const distKm = haversineKm(simLat, simLng, COMPANY_AREA.lat, COMPANY_AREA.lng);
        const inside = distKm <= COMPANY_AREA.radiusKm;

        const res = document.getElementById('locationResult');
        if (res) res.classList.remove('hidden');

        setEl('locLat',           simLat.toFixed(6) + ' (simulated)');
        setEl('locLng',           simLng.toFixed(6) + ' (simulated)');
        setEl('locStatus',        inside ? '✅ Inside Company Area' : '🔴 Outside Company Area');
        setEl('locParticipation', inside ? '✅ Participating' : '⚠ Not Participating');
        setEl('locationBadgeCard', inside ? 'Inside' : 'Outside');

        if (btn) { btn.textContent = 'Share Location'; btn.disabled = false; }
      }
    );
  }

  // =============================================
  //  REPORT GENERATION
  // =============================================

  /**
   * Build a printable HTML report and trigger browser print/download.
   */
  function generateReport() {
    const sess = JSON.parse(localStorage.getItem(KEY_SESSION));
    const name     = document.getElementById('rptName')?.value.trim()    || (sess?.name || '');
    const id       = document.getElementById('rptId')?.value.trim()      || (sess?.studentId || '');
    const company  = document.getElementById('rptCompany')?.value.trim() || (sess?.company || '');
    const duration = document.getElementById('rptDuration')?.value.trim() || '';
    const summary  = document.getElementById('rptSummary')?.value.trim() || '';

    if (!name || !company) {
      alert('Please fill in at least your Name and Company.');
      return;
    }

    const records = getDTR(sess?.id || '');
    const total   = totalHours(sess?.id || '');
    const complete = records.filter(r => r.status === 'Complete').length;

    // Build DTR rows for the report
    const dtrRows = records
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => {
        const hrs = calcHours(r.timeIn, r.timeOut);
        return `<tr>
          <td>${formatDate(r.date)}</td>
          <td>${formatTime(r.timeIn)}</td>
          <td>${formatTime(r.timeOut)}</td>
          <td>${hrs ? hrs + 'h' : '—'}</td>
          <td>${r.status}</td>
        </tr>`;
      }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>OJT Report — ${name}</title>
<style>
  body { font-family: Georgia, serif; color: #111; max-width: 800px; margin: 40px auto; padding: 0 24px; }
  h1 { font-size: 1.6rem; border-bottom: 3px solid #222; padding-bottom: 8px; }
  h2 { font-size: 1.1rem; margin-top: 24px; color: #333; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { padding: 8px 12px; border: 1px solid #ccc; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .field { display: flex; gap: 16px; margin: 6px 0; font-size: 14px; }
  .field strong { min-width: 140px; color: #555; }
  .summary { background: #fafafa; border: 1px solid #ddd; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.8; white-space: pre-wrap; }
  .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 16px; font-size: 12px; color: #888; }
  .sig-line { border-top: 1px solid #333; width: 220px; margin-top: 48px; }
</style>
</head>
<body>
  <div style="text-align:center; margin-bottom: 24px;">
    <div style="font-size:1rem; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#555; margin-bottom:4px;">On-the-Job Training Tracking System</div>
    <h1>OJT Completion Report</h1>
    <div style="color:#777; font-size:13px;">Generated: ${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</div>
  </div>

  <h2>Student Information</h2>
  <div class="field"><strong>Full Name:</strong> ${name}</div>
  <div class="field"><strong>Student ID:</strong> ${id}</div>
  <div class="field"><strong>Company:</strong> ${company}</div>
  <div class="field"><strong>OJT Duration:</strong> ${duration || 'Not specified'}</div>
  <div class="field"><strong>Total Hours Rendered:</strong> ${total}h</div>
  <div class="field"><strong>Days with Complete DTR:</strong> ${complete} day(s)</div>

  <h2>Summary of Activities</h2>
  <div class="summary">${summary || 'No summary provided.'}</div>

  <h2>Daily Time Record</h2>
  ${records.length > 0 ? `
  <table>
    <thead><tr><th>Date</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Status</th></tr></thead>
    <tbody>${dtrRows}</tbody>
  </table>` : '<p style="color:#888; font-style:italic;">No attendance records found.</p>'}

  <div class="footer">
    <div style="display:flex; justify-content:space-between; margin-top:48px;">
      <div>
        <div class="sig-line"></div>
        <div style="margin-top:6px; font-size:13px;">Student Signature / Date</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div style="margin-top:6px; font-size:13px;">Adviser Signature / Date</div>
      </div>
    </div>
    <p style="margin-top:24px;">This document was auto-generated by the OJT Tracking System (OJT-TS).</p>
  </div>
</body>
</html>`;

    // Open in new tab and trigger print
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }

  // =============================================
  //  EMERGENCY / ILLNESS REPORTS
  // =============================================

  /** Get all emergency reports */
  function getEmergencies() {
    const raw = localStorage.getItem(KEY_EMERGENCY);
    return raw ? JSON.parse(raw) : [];
  }

  /** Save all emergency reports */
  function saveEmergencies(list) {
    localStorage.setItem(KEY_EMERGENCY, JSON.stringify(list));
  }

  /** Submit an emergency report from the student */
  function submitEmergency() {
    const sess = JSON.parse(localStorage.getItem(KEY_SESSION));
    if (!sess) return;

    const reasonEl = document.querySelector('input[name="emergReason"]:checked');
    const date     = document.getElementById('emergDate')?.value;
    const desc     = document.getElementById('emergDesc')?.value.trim();

    if (!reasonEl) { alert('Please select a reason.'); return; }
    if (!date)     { alert('Please select a date.'); return; }
    if (!desc)     { alert('Please enter a description.'); return; }

    const list = getEmergencies();
    list.push({
      id:          Date.now(),
      studentId:   sess.id,
      studentName: sess.name,
      reason:      reasonEl.value,
      date,
      description: desc,
      submittedAt: new Date().toISOString()
    });
    saveEmergencies(list);

    // Reset form
    document.querySelectorAll('input[name="emergReason"]').forEach(r => r.checked = false);
    if (document.getElementById('emergDate'))  document.getElementById('emergDate').value = '';
    if (document.getElementById('emergDesc'))  document.getElementById('emergDesc').value = '';

    // Show success
    const succ = document.getElementById('emergSuccess');
    if (succ) {
      succ.classList.remove('hidden');
      setTimeout(() => succ.classList.add('hidden'), 4000);
    }

    renderMyEmergencyTable(sess.id);
  }

  /** Render a student's own emergency reports */
  function renderMyEmergencyTable(studentId) {
    const tbody = document.getElementById('myEmergencyTable');
    if (!tbody) return;

    const list = getEmergencies().filter(e => e.studentId === studentId);
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No reports submitted.</td></tr>';
      return;
    }

    tbody.innerHTML = list
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map(e => `<tr>
        <td>${formatDate(e.date)}</td>
        <td><span class="badge badge-emergency">${e.reason}</span></td>
        <td>${e.description}</td>
        <td>${formatTime(e.submittedAt)}</td>
      </tr>`).join('');
  }

  // =============================================
  //  ADVISER DASHBOARD RENDERER
  // =============================================

  function renderAdviserDashboard(sess) {
    const students = MOCK_USERS.filter(u => u.role === 'student');
    const emergencies = getEmergencies();
    const today = todayStr();

    // ---- Stat cards ----
    setEl('totalStudents', students.length);

    let activeToday = 0, incompleteCount = 0;
    students.forEach(s => {
      const recs = getDTR(s.id);
      const todayRec = recs.find(r => r.date === today);
      if (todayRec && todayRec.timeIn && !todayRec.timeOut) activeToday++;
      incompleteCount += recs.filter(r => r.status === 'Incomplete').length;
    });

    setEl('activeToday', activeToday);
    setEl('pendingDTR',  incompleteCount);
    setEl('emergCount',  emergencies.length);

    // ---- Overview table ----
    const overviewBody = document.getElementById('overviewStudentTable');
    if (overviewBody) {
      overviewBody.innerHTML = students.map(s => {
        const recs    = getDTR(s.id);
        const total   = totalHours(s.id);
        const todayRec = recs.find(r => r.date === today);
        const isActive = todayRec && todayRec.timeIn && !todayRec.timeOut;
        const badge = isActive
          ? '<span class="badge badge-active">Active</span>'
          : '<span class="badge badge-inactive">Inactive</span>';
        return `<tr>
          <td style="color:var(--text); font-weight:500">${s.name}</td>
          <td>${s.studentId}</td>
          <td>${s.company}</td>
          <td>${total}h</td>
          <td>${badge}</td>
        </tr>`;
      }).join('');
    }

    // ---- Student cards ----
    const grid = document.getElementById('studentCards');
    if (grid) {
      grid.innerHTML = students.map(s => {
        const recs     = getDTR(s.id);
        const total    = totalHours(s.id);
        const complete = recs.filter(r => r.status === 'Complete').length;
        const todayRec = recs.find(r => r.date === today);
        const isActive = todayRec && todayRec.timeIn && !todayRec.timeOut;
        const initials = s.name.split(' ').map(n => n[0]).slice(0,2).join('');
        const badge = isActive
          ? '<span class="badge badge-active">Active</span>'
          : '<span class="badge badge-inactive">Inactive</span>';
        return `<div class="student-card">
          <div class="sc-avatar">${initials}</div>
          <div class="sc-name">${s.name}</div>
          <div class="sc-company">${s.company}</div>
          <div class="sc-stats">
            <div class="sc-stat"><strong>${total}h</strong><br>Total Hours</div>
            <div class="sc-stat"><strong>${complete}</strong><br>Days Complete</div>
            <div class="sc-stat"><strong>${recs.length}</strong><br>Total Records</div>
          </div>
          ${badge}
        </div>`;
      }).join('');
    }

    // ---- All DTRs ----
    const filterSelect = document.getElementById('studentFilter');
    if (filterSelect && filterSelect.options.length === 1) {
      students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        filterSelect.appendChild(opt);
      });
    }
    filterDTR('all');

    // ---- All Emergency Reports ----
    const emergBody = document.getElementById('allEmergencyTable');
    if (emergBody) {
      if (emergencies.length === 0) {
        emergBody.innerHTML = '<tr><td colspan="5" class="empty-row">No emergency reports.</td></tr>';
      } else {
        emergBody.innerHTML = emergencies
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
          .map(e => `<tr>
            <td style="color:var(--text); font-weight:500">${e.studentName}</td>
            <td>${formatDate(e.date)}</td>
            <td><span class="badge badge-emergency">${e.reason}</span></td>
            <td>${e.description}</td>
            <td>${formatTime(e.submittedAt)}</td>
          </tr>`).join('');
      }
    }
  }

  /** Filter the DTR table by student ID (or 'all') */
  function filterDTR(studentId) {
    const students = MOCK_USERS.filter(u => u.role === 'student');
    let records = [];

    if (studentId === 'all') {
      students.forEach(s => {
        getDTR(s.id).forEach(r => {
          records.push({ ...r, studentName: s.name });
        });
      });
      setEl('selectedStudentName', 'All Students');
    } else {
      const s = MOCK_USERS.find(u => u.id === studentId);
      records = getDTR(studentId).map(r => ({ ...r, studentName: s?.name || 'Unknown' }));
      setEl('selectedStudentName', s?.name || 'Unknown');
    }

    renderDTRTable('allDtrTable', records, true);
  }

  // =============================================
  //  DOM HELPERS
  // =============================================

  function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // =============================================
  //  SEED DEMO DATA (optional, runs once)
  // =============================================

  /**
   * Seed some historical DTR records for demo purposes
   * so the adviser dashboard has data to show.
   */
  function seedDemoData() {
    const seeded = localStorage.getItem('ojt_demo_seeded');
    if (seeded) return;

    const students = MOCK_USERS.filter(u => u.role === 'student');

    students.forEach((s, si) => {
      const records = [];
      // Create 5 past records per student
      for (let i = 1; i <= 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i - si * 2);
        const dateStr = d.toISOString().slice(0, 10);

        const inTime  = new Date(d);
        inTime.setHours(8, Math.floor(Math.random() * 30), 0);
        const outTime = new Date(d);
        outTime.setHours(17, Math.floor(Math.random() * 30), 0);

        records.push({
          id:          inTime.getTime(),
          studentId:   s.id,
          studentName: s.name,
          date:        dateStr,
          timeIn:      inTime.toISOString(),
          timeOut:     outTime.toISOString(),
          status:      'Complete'
        });
      }
      saveDTR(s.id, records);
    });

    localStorage.setItem('ojt_demo_seeded', '1');
  }

  // Auto-seed on first load
  seedDemoData();

  // =============================================
  //  PUBLIC API
  // =============================================

  return {
    authenticate,
    logout,
    timeIn,
    timeOut,
    checkLocation,
    generateReport,
    submitEmergency,
    filterDTR,
    renderStudentDashboard,
    renderAdviserDashboard
  };

})();
