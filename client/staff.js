const API = "http://localhost:5000";

// Hardcoded for now. When login is added, this will be set
// based on whoever logged in.
const STAFF_ID = "S0001";

async function updateStatus(apptID) {
  // Read the new status from the dropdown for this appointment
  const newStatus = document.getElementById(`status-${apptID}`).value;

  try {
    await fetch(`${API}/api/appointments/${apptID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    // Refresh the page data so the new status (and any new invoice) shows up
    fetchStaffData();
  } catch (err) {
    console.error("Failed to update status:", err);
  }
}

async function updateNotes(apptID) {
  // Read the new notes from the input for this appointment
  const newNotes = document.getElementById(`notes-${apptID}`).value;

  try {
    await fetch(`${API}/api/appointments/${apptID}/notes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceNotes: newNotes }),
    });
    fetchStaffData();
  } catch (err) {
    console.error("Failed to update notes:", err);
  }
}

async function updateAvailability() {
  const newAvailability = document.getElementById("availability-input").value;

  // Don't submit empty values
  if (!newAvailability.trim()) return;

  try {
    await fetch(`${API}/api/staff/${STAFF_ID}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: newAvailability }),
    });
    fetchStaffData();
  } catch (err) {
    console.error("Failed to update availability:", err);
  }
}

async function updatePhone() {
  const newPhone = document.getElementById("phone-input").value;
  if (!newPhone.trim()) return;
  try {
    await fetch(`${API}/api/staff/${STAFF_ID}/phone`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNo: newPhone }),
    });
    fetchStaffData();
  } catch (err) {
    console.error("Failed to update phone:", err);
  }
}

async function updateEmail() {
  const newEmail = document.getElementById("email-input").value;
  if (!newEmail.trim()) return;
  try {
    await fetch(`${API}/api/staff/${STAFF_ID}/email`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail }),
    });
    fetchStaffData();
  } catch (err) {
    console.error("Failed to update email:", err);
  }
}

async function updateDuration(apptID) {
  const newDuration = document.getElementById(`duration-${apptID}`).value;
  if (!newDuration) return;
  try {
    await fetch(`${API}/api/appointments/${apptID}/duration`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duration: parseFloat(newDuration) }),
    });
    fetchStaffData();
  } catch (err) {
    console.error("Failed to update duration:", err);
  }
}

async function fetchStaffData() {
  try {
    // 1. PROFILE: fetch this staff member's basic info
    const profileRes = await fetch(`${API}/api/staff/${STAFF_ID}`);
    const profile = await profileRes.json();

    document.getElementById("profile-name").textContent = profile.staffName;
    document.getElementById("profile-role").textContent = profile.role;
    document.getElementById("profile-phone").textContent = profile.phoneNo;
    document.getElementById("profile-email").textContent = profile.email;
    document.getElementById("profile-availability").textContent = profile.availability;
    document.getElementById("profile-rating").textContent = profile.staffRating;

    // 2. SERVICES: fetch services this staff member can perform
    const servicesRes = await fetch(`${API}/api/staff/${STAFF_ID}/services`);
    const services = await servicesRes.json();

    document.getElementById("services").innerHTML = services
      .map(
        (row) => `
          <tr>
            <td>${row.serviceID}</td>
            <td>${row.serviceName}</td>
            <td>${row.serviceType}</td>
            <td>${row.standardDuration}</td>
          </tr>
        `,
      )
      .join("");

    // 3. APPOINTMENTS: fetch this staff member's appointments
    const appointmentsRes = await fetch(`${API}/api/staff/${STAFF_ID}/appointments`);
    const appointments = await appointmentsRes.json();

    document.getElementById("appointments").innerHTML = appointments
      .map(
        (row) => `
          <tr>
            <td>${row.apptID}</td>
            <td>${new Date(row.date).toLocaleDateString()}</td>
            <td>${row.startTime}</td>
            <td>${row.duration}</td>
            <td>
                <input type="number" id="duration-${row.apptID}" value="${row.duration}" step="0.25" min="0.25" style="width: 60px;" />
                <button onclick="updateDuration('${row.apptID}')">Save</button>
            </td>
            <td>${row.petName}</td>
            <td>${row.serviceName}</td>
            <td>${row.appointmentStatus}</td>
            <td>${row.serviceNotes ?? ""}</td>
            <td>
              <input type="text" id="notes-${row.apptID}" value="${row.serviceNotes ?? ""}" />
              <button onclick="updateNotes('${row.apptID}')">Save Notes</button>
            </td>
            <td>${row.appointmentRating ?? ""}</td>
            <td>
              <select id="status-${row.apptID}">
                <option value="scheduled" ${row.appointmentStatus === "scheduled" ? "selected" : ""}>Scheduled</option>
                <option value="in progress" ${row.appointmentStatus === "in progress" ? "selected" : ""}>In Progress</option>
                <option value="complete" ${row.appointmentStatus === "complete" ? "selected" : ""}>Complete</option>
              </select>
              <button onclick="updateStatus('${row.apptID}')">Save</button>
            </td>
          </tr>
        `,
      )
      .join("");
  } catch (err) {
    console.error("Error fetching staff data:", err);
  }
}

// Run when the page loads
fetchStaffData();