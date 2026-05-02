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
        <td>${row.invoice_status}</td>
        <td>${row.payment_status ?? "N/A"}</td>
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
        <td>${row.appt_status}</td>
      </tr>
    `,
      )
      .join("");
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

fetchData();
