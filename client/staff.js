const API = "http://localhost:5000";

// Hardcoded for now. When login is added, this will be set
// based on whoever logged in.
const STAFF_ID = "S0001";

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
            <td>${row.petName}</td>
            <td>${row.serviceName}</td>
            <td>${row.appointmentStatus}</td>
            <td>${row.serviceNotes ?? ""}</td>
            <td>${row.appointmentRating ?? ""}</td>
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