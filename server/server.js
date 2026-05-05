const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// DB connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Add new DB queries here
app.get("/data", async (req, res) => {
  try {
    // Find customers with the most amount of pets to identify high-value or repeat customers
    const [repeatCustomers] = await db.query(
      `SELECT c.customerName, COUNT(p.petID) AS num_pets 
      FROM Pet p 
      JOIN Customer c 
      ON c.customerID = p.customerID 
      GROUP BY p.customerID 
      ORDER BY COUNT(p.petID) DESC;`,
    );
    // Staff overview
    const [staff] = await db.query(
      `SELECT p.staffID, st.staffName, p.serviceID, se.serviceName 
      FROM Performs p 
      JOIN Staff st 
      ON p.staffID = st.staffID 
      JOIN Service se ON se.serviceID=p.serviceID;`,
    );
    // Invoice overview
    const [invoices] = await db.query(
      `SELECT I.invoiceID, I.customerID, C.customerName, I.amount, P.method, I.adminID, A.name, I.dueDate, I.status AS invoice_status, P.status AS payment_status 
      FROM Invoice I 
      JOIN Customer C ON C.customerID=I.customerID 
      LEFT JOIN Payment P ON P.invoiceID=I.invoiceID 
      JOIN Admin A on A.adminID=I.adminID;`,
    );
    // Analyze staff appointment ratings by staff member compared to overall average ratings to evaluate performance
    const [staffRatings] = await db.query(
      `SELECT staffID, staffName, staffRating 
      FROM Staff 
      WHERE staffRating > (SELECT AVG(staffRating) FROM Staff) 
      ORDER BY staffRating DESC;`,
    );
    // All staff (for the customer's booking dropdown)
    const [allStaff] = await db.query(
      `SELECT staffID, staffName, role FROM Staff ORDER BY staffName;`
    );
    // Appointment status
    const [appointmentStatus] = await db.query(
      `SELECT A.apptID, P.petName, Se.serviceName, St.staffName, Se.standardDuration AS appt_len, A.appointmentStatus AS appt_status 
      FROM Appointment A 
      JOIN Service Se ON Se.serviceID=A.serviceID 
      JOIN Pet P ON P.petID=A.petID 
      JOIN Staff St ON St.staffID=A.staffID;`,
    );

    const [pets] = await db.query("SELECT p.petID, p.petName FROM Pet p;");

    // Remember to add new queries here
    res.json({
      repeatCustomers,
      staff,
      invoices,
      staffRatings,
      allStaff,
      appointmentStatus,
      pets,
    });
  } catch (err) {
    console.error("Error executing queries:", err);
    res.status(500).send("Server error");
  }
});

//Create new tuple
app.post("/api/appointments", async (req, res) => {
  const {
    apptID,
    petID,
    staffID,
    appointmentStatus,
    serviceID,
    date,
    startTime,
    duration,
    serviceNotes,
    appointmentRating,
  } = req.body;
  try {
    await db.query(
      `INSERT INTO Appointment (apptID, petID, staffID, appointmentStatus, serviceID, date, startTime, duration, serviceNotes, appointmentRating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        apptID,
        petID,
        staffID,
        appointmentStatus,
        serviceID,
        date,
        startTime,
        duration,
        serviceNotes,
        appointmentRating,
      ],
    );
    res.status(201).json({ message: "Appointment created" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Update an appointment's service notes
app.put("/api/appointments/:id/notes", async (req, res) => {
  const { id } = req.params;
  const { serviceNotes } = req.body;
  try {
    await db.query(
      `UPDATE Appointment SET serviceNotes = ? WHERE apptID = ?`,
      [serviceNotes, id],
    );
    res.json({ message: "Notes updated" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Update a staff member's availability
app.put("/api/staff/:id/availability", async (req, res) => {
  const { id } = req.params;
  const { availability } = req.body;
  try {
    await db.query(
      `UPDATE Staff SET availability = ? WHERE staffID = ?`,
      [availability, id],
    );
    res.json({ message: "Availability updated" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Update tuple
app.put("/api/appointments/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await db.query(
      `UPDATE Appointment SET appointmentStatus = ? WHERE apptID = ?`,
      [status, id],
    );
    res.json({ message: "Appointment updated" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Delete tuple
app.delete("/api/appointments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM Appointment WHERE apptID = ?`, [id]);
    res.json({ message: "Appointment deleted" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Get one staff member's info
app.get("/api/staff/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT staffID, staffName, role, phoneNo, email, availability, staffRating, (SELECT COUNT(*) FROM Appointment
      WHERE staffID = ? AND appointmentRating IS NOT NULL) AS reviewCount
      FROM Staff
       WHERE staffID = ?`,
      [id, id],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Get services this staff member is qualified to perform
app.get("/api/staff/:id/services", async (req, res) => {
  const { id } = req.params;
  try {
    const [services] = await db.query(
      `SELECT s.serviceID, s.serviceName, s.serviceType, s.standardDuration
       FROM Performs p
       JOIN Service s ON s.serviceID = p.serviceID
       WHERE p.staffID = ?`,
      [id],
    );
    res.json(services);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Get appointments assigned to this staff member
app.get("/api/staff/:id/appointments", async (req, res) => {
  const { id } = req.params;
  try {
    const [appointments] = await db.query(
      `SELECT a.apptID, a.date, a.startTime, a.duration, a.appointmentStatus, a.serviceNotes, a.appointmentRating, p.petName, p.type AS petType, p.breed, p.size, p.behavioralNotes, s.serviceName, c.customerName, c.phoneNo AS customerPhone
      FROM Appointment a JOIN Pet p ON p.petID = a.petID JOIN Service s ON s.serviceID = a.serviceID JOIN Customer c ON c.customerID = p.customerID
      WHERE a.staffID = ? ORDER BY a.date, a.startTime`,
      [id],
    );
    res.json(appointments);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Update a staff member's phone
app.put("/api/staff/:id/phone", async (req, res) => {
  const { id } = req.params;
  const { phoneNo } = req.body;
  try {
    await db.query(
      `UPDATE Staff SET phoneNo = ? WHERE staffID = ?`,
      [phoneNo, id],
    );
    res.json({ message: "Phone number updated" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Update a staff member's email
app.put("/api/staff/:id/email", async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  try {
    await db.query(
      `UPDATE Staff SET email = ? WHERE staffID = ?`,
      [email, id],
    );
    res.json({ message: "Email updated" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Update an appointment's duration
app.put("/api/appointments/:id/duration", async (req, res) => {
  const { id } = req.params;
  const { duration } = req.body;
  try {
    await db.query(
      `UPDATE Appointment SET duration = ? WHERE apptID = ?`,
      [duration, id],
    );
    res.json({ message: "Duration updated" });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Total company appointments for a given month/year (uses GetMonthlyServiceCount function)
app.get("/api/monthly-service-count/:month/:year", async (req, res) => {
  const { month, year } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT GetMonthlyServiceCount(?, ?) AS total`,
      [month, year],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* Starting server */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
