const API = "http://localhost:5000";

async function deleteAppointment(id) {
  try {
    await fetch(`${API}/api/appointments/${id}`, { method: "DELETE" });
    fetchCustomerData();
    console.log(id);
  } catch (err) {
    console.error("Delete failed:", err);
  }
}

async function fetchCustomerData() {
  try {
    const res = await fetch(`${API}/data`);
    const data = await res.json();

    // Render Staff
    document.getElementById("staff").innerHTML = data.staff
      .map(
        (row) => `
            <tr>
                <td>${row.staffID}</td>
                <td>${row.staffName}</td>
                <td>${row.serviceID}</td>
                <td>${row.serviceName}</td>
            </tr>
        `,
      )
      .join("");

    // Render Invoices
    document.getElementById("invoices").innerHTML = data.invoices
      .filter((row) => row.customerName === "Barry")
      .map(
        (row) => `
            <tr>
                <td>${row.invoiceID}</td>
                <td>${row.customerName}</td>
                <td>$${row.amount}</td>
                <td>${row.method ?? "N/A"}</td>
                <td>${row.name}</td>
                <td>${new Date(row.dueDate).toLocaleDateString()}</td>
                <td>${row.invoice_status}</td>
                <td>${row.payment_status ?? "N/A"}</td>
            </tr>
        `,
      )
      .join("");

    // Render Staff Ratings
    document.getElementById("staff-ratings").innerHTML = data.staffRatings
      .map(
        (row) => `
            <tr>
                <td>${row.staffID}</td>
                <td>${row.staffName}</td>
                <td>${row.staffRating}</td>
            </tr>
        `,
      )
      .join("");

    // Render Appointments
    document.getElementById("appointments").innerHTML = data.appointmentStatus
      .filter((row) => row.petName === "Amber")
      .map(
        (row) => `
            <tr>
                <td>${row.apptID}</td>
                <td>${row.petName}</td>
                <td>${row.serviceName}</td>
                <td>${row.staffName}</td>
                <td>${row.appt_len} hrs</td>
                <td>${row.appt_status}</td>
                <td>
                    <button onclick="deleteAppointment('${row.apptID}')">Delete</button>
                </td>
            </tr>
        `,
      )
      .join("");

    // Populate Pet Dropdown
    if (data.pets) {
      document.getElementById("pet-select").innerHTML =
        '<option value="">-- Select Pet --</option>' +
        data.pets
          .map((p) => `<option value="${p.petID}">${p.petName}</option>`)
          .join("");
    }

    // Populate Service Dropdown
    const services = data.staff.reduce((acc, current) => {
      if (!acc.find((s) => s.serviceID === current.serviceID)) {
        acc.push({ serviceID: current.serviceID, name: current.serviceName });
      }
      return acc;
    }, []);

    document.getElementById("service-select").innerHTML =
      '<option value="">-- Select Service --</option>' +
      services
        .map((s) => `<option value="${s.serviceID}">${s.name}</option>`)
        .join("");

    // Populate Staff Dropdown
    document.getElementById("staff-select").innerHTML =
      '<option value="">-- Select Staff --</option>' +
      data.allStaff
        .map((s) => `<option value="${s.staffID}">${s.staffName}</option>`)
        .join("");
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

// Updated Form Listener
document
  .getElementById("create-appointment-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());

    // Convert duration and appointmentRating to numbers if present
    if (body.duration) body.duration = parseFloat(body.duration);
    if (body.appointmentRating)
      body.appointmentRating = parseInt(body.appointmentRating);

    await fetch(`${API}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    fetchCustomerData();
    e.target.reset();
  });

document
  .getElementById("update-appointment-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("update-id").value;
    const status = document.getElementById("update-status").value;

    console.log("Updating:", { id, status });

    await fetch(`${API}/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchCustomerData();
  });

fetchCustomerData();
