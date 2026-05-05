const API = "http://localhost:5000";

async function fetchData() {
  try {
    const res = await fetch(`${API}/data`);
    const data = await res.json();

    // Repeat Customers
    document.getElementById("repeat-customers").innerHTML = data.repeatCustomers
      .map(
        (row) => `
      <tr>
        <td>${row.customerName}</td>
        <td>${row.num_pets}</td>
      </tr>
    `,
      )
      .join("");

    // Staff
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

    // Invoices
    document.getElementById("invoices").innerHTML = data.invoices
      .map(
        (row) => `
      <tr>
        <td>${row.invoiceID}</td>
        <td>${row.customerName}</td>
        <td>$${row.amount}</td>
        <td>${row.method ?? "N/A"}</td>
        <td>${row.name}</td>
        <td>${new Date(row.dueDate).toLocaleDateString()}</td>
        <td>
          <select onchange="updateInvoiceStatus('${row.invoiceID}', this.value)">
            <option value="unpaid" ${row.invoice_status === "unpaid" ? "selected" : ""}>unpaid</option>
            <option value="paid" ${row.invoice_status === "paid" ? "selected" : ""}>paid</option>
          </select>
        </td>
        <td>
          <select onchange="updatePaymentStatus('${row.invoiceID}', this.value)">
            <option value="pending" ${row.payment_status === "pending" ? "selected" : ""}>pending</option>
            <option value="completed" ${row.payment_status === "completed" ? "selected" : ""}>completed</option>
            <option value="failed" ${row.payment_status === "failed" ? "selected" : ""}>failed</option>
          </select>
        </td>
        <td><button onclick="deleteInvoice('${row.invoiceID}')">Delete</button></td>
      </tr>
    `,
      )
      .join("");

    // Staff Ratings
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

    // Appointments
    document.getElementById("appointments").innerHTML = data.appointmentStatus
      .map(
        (row) => `
      <tr>
          <td>${row.apptID}</td>
          <td>${row.petName}</td>
          <td>${row.serviceName}</td>
          <td>${row.staffName}</td>
          <td>${row.appt_len} hrs</td>
          <td>
            <select onchange="updateAppointmentStatus('${row.apptID}', this.value)">
              <option value="scheduled" ${row.appt_status === "scheduled" ? "selected" : ""}>
              scheduled</option>
              <option value="in progress" ${row.appt_status === "in progress" ? "selected" : ""}>
              in progress</option>
              <option value="complete" ${row.appt_status === "complete" ? "selected" : ""}>
              complete</option>
            </select>
          </td>
          <td>
              <button onclick="deleteAppointment('${row.apptID}')">Delete</button>
          </td>
        </tr>
      `,
    )
    .join("");
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}
      

fetchData();

async function loadPeakHours() {
  const res = await fetch(`${API}/api/peak-hours`);
  const data = await res.json();

  document.getElementById("peak-hours").innerHTML = data
    .map(
      (row) => `
      <tr>
        <td>${row.peak_hours}</td>
        <td>${row.total_appointments}</td>
      </tr>
    `
    )
    .join("");
}

async function deleteAppointment(id) {
  try {
    await fetch(`${API}/api/appointments/${id}`, {
      method: "DELETE",
    });

    fetchData(); 
  } catch (err) {
    console.error("Delete failed:", err);
  }
}

async function updateAppointmentStatus(id, status) {
  try {
    await fetch(`${API}/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    fetchData(); 
  } catch (err) {
    console.error("Update failed:", err);
  }
}

async function updateInvoiceStatus(id, status) {
  try {
    await fetch(`${API}/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    fetchData();
  } catch (err) {
    console.error("Invoice update failed:", err);
  }
}

async function updatePaymentStatus(id, status) {
  try {
    await fetch(`${API}/api/payments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    fetchData();
  } catch (err) {
    console.error("Payment update failed:", err);
  }
}

async function deleteInvoice(id) {
  try {
    await fetch(`${API}/api/invoices/${id}`, {
      method: "DELETE",
    });

    fetchData();
  } catch (err) {
    console.error("Delete invoice failed:", err);
  }
}


async function loadPetService() {
  const res = await fetch(`${API}/api/pet-service-usage`);
  const data = await res.json();

  document.getElementById("pet-service").innerHTML = data
    .map(
      (row) => `
      <tr>
        <td>${row.petID}</td>
        <td>${row.petName}</td>
        <td>${row.serviceName}</td>
        <td>${row.times_used}</td>
      </tr>
    `
    )
    .join("");
}


async function loadMonthly() {
  const month = document.getElementById("month").value;
  const year = document.getElementById("year").value;
  if (!month || !year) {
    alert("Please enter both month and year");
    return;
  }
  const res = await fetch(
    `${API}/api/monthly-service-count/${month}/${year}`
  );
  const data = await res.json();
  document.getElementById("monthly-result").innerText =
    `Total Services: ${data.total}`;
}



