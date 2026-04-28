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
    // Appointment status
    const [appointmentStatus] = await db.query(
      `SELECT A.apptID, P.petName, Se.serviceName, St.staffName, Se.standardDuration AS appt_len, A.appointmentStatus AS appt_status 
      FROM Appointment A 
      JOIN Service Se ON Se.serviceID=A.serviceID 
      JOIN Pet P ON P.petID=A.petID 
      JOIN Staff St ON St.staffID=A.staffID;`,
    );

    // Remember to add new queries here
    res.json({
      repeatCustomers,
      staff,
      invoices,
      staffRatings,
      appointmentStatus,
    });
  } catch (err) {
    console.error("Error executing queries:", err);
    res.status(500).send("Server error");
  }
});

/* Starting server */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
