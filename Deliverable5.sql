DROP DATABASE IF EXISTS PetServices;
CREATE DATABASE PetServices;
USE PetServices;

CREATE TABLE Customer (
    customerID VARCHAR(10) NOT NULL,
    customerName VARCHAR(100),
    phoneNo VARCHAR(20),
    email VARCHAR(50),
    address VARCHAR(255),
    PRIMARY KEY (CustomerID)
);

CREATE TABLE Pet (
    petID VARCHAR(10) NOT NULL,
    customerID VARCHAR(10) NOT NULL,
    petName VARCHAR(100),
    age INT,
    type VARCHAR(100),
    breed VARCHAR(100),
    size VARCHAR(20)
        CHECK (size IN ('small', 'medium', 'large')),
    behavioralNotes VARCHAR(1000),
    PRIMARY KEY (petID),
    FOREIGN KEY (customerID) REFERENCES Customer(customerID)
);

CREATE TABLE Staff (
    staffID VARCHAR(10) NOT NULL,
    staffName VARCHAR(100),
    role VARCHAR(20)
        CHECK (role IN ('Walker', 'Sitter', 'Trainer')),
    phoneNo VARCHAR(20),
    email VARCHAR(50),
    availability VARCHAR(255),
    staffRating DECIMAL(3,2)
        CHECK (staffRating BETWEEN 1 AND 5),
    PRIMARY KEY (staffID)
);

CREATE TABLE Service (
    serviceID VARCHAR(10) NOT NULL,
    serviceName VARCHAR(100) NOT NULL,
    serviceType VARCHAR(50) NOT NULL
        CHECK (serviceType IN ('dog-walking', 'pet-sitting', 'training')),
    standardDuration DECIMAL(4,2)
        CHECK (standardDuration > 0),
    description VARCHAR(500),
    PRIMARY KEY (serviceID)
);

CREATE TABLE Performs (
    staffID VARCHAR(10) NOT NULL,
    serviceID VARCHAR(10) NOT NULL,
    PRIMARY KEY (staffID, serviceID),
    FOREIGN KEY (staffID) REFERENCES Staff(staffID),
    FOREIGN KEY (serviceID) REFERENCES Service(serviceID)
);

CREATE TABLE Appointment (
    apptID VARCHAR(10) NOT NULL,
	petID VARCHAR(10) NOT NULL,
    staffID VARCHAR(10) NOT NULL,
	appointmentStatus VARCHAR(20) NOT NULL
        CHECK (appointmentStatus IN ('scheduled', 'in progress', 'complete')),
    serviceID VARCHAR(10) NOT NULL,
    date DATE,
    startTime time,
    duration DECIMAL(4,2),
    serviceNotes VARCHAR(1000),
    appointmentRating INT 
		CHECK (appointmentRating BETWEEN 1 AND 5),
    PRIMARY KEY (apptID),
    FOREIGN KEY (petID) REFERENCES Pet(petID),
    FOREIGN KEY (staffID) REFERENCES Staff(staffID),
    FOREIGN KEY (serviceID) REFERENCES Service(serviceID)
);

CREATE TABLE Admin (
    adminID VARCHAR(10) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(50),
    phoneNo VARCHAR(20),
    PRIMARY KEY (adminID)
);

CREATE TABLE Invoice (
    invoiceID VARCHAR(10) NOT NULL,
    customerID VARCHAR(10) NOT NULL,
    adminID VARCHAR(10) NOT NULL,
    status VARCHAR(20)
        CHECK (status IN ('unpaid', 'paid')),
    billingAddress VARCHAR(255),
    amount DECIMAL(10,2),
    dateCreated DATE,
    dueDate DATE,
    serviceDescription VARCHAR(255),
    PRIMARY KEY (invoiceID),
    FOREIGN KEY (customerID) REFERENCES Customer(customerID),
    FOREIGN KEY (adminID) REFERENCES Admin(adminID)
);

CREATE TABLE Payment (
    paymentID VARCHAR(10) NOT NULL,
    invoiceID VARCHAR(10) NOT NULL,
    adminID VARCHAR(10) NOT NULL,
    amount DECIMAL(10,2),
    date DATE,
    method VARCHAR(20)
        CHECK (method IN ('credit card', 'debit', 'cash', 'online')),
    status VARCHAR(20)
        CHECK (status IN ('pending', 'completed', 'failed')),
    PRIMARY KEY (paymentID),
    FOREIGN KEY (invoiceID) REFERENCES Invoice(invoiceID),
    FOREIGN KEY (adminID) REFERENCES Admin(adminID)
);


-- TRIGGERS (defined before inserts so they fire on seed data)

-- Recalculate a staff member's rating whenever appointments change
DROP TRIGGER IF EXISTS trg_update_staff_rating_insert;
DROP TRIGGER IF EXISTS trg_update_staff_rating_update;
DROP TRIGGER IF EXISTS trg_update_staff_rating_delete;
DROP TRIGGER IF EXISTS trg_update_staff_rating;

DELIMITER ;;

CREATE TRIGGER trg_update_staff_rating_insert
AFTER INSERT ON Appointment
FOR EACH ROW
BEGIN
    UPDATE Staff
    SET staffRating = (
        SELECT AVG(appointmentRating)
        FROM Appointment
        WHERE staffID = NEW.staffID
          AND appointmentRating IS NOT NULL
    )
    WHERE staffID = NEW.staffID;
END;;

CREATE TRIGGER trg_update_staff_rating_update
AFTER UPDATE ON Appointment
FOR EACH ROW
BEGIN
    UPDATE Staff
    SET staffRating = (
        SELECT AVG(appointmentRating)
        FROM Appointment
        WHERE staffID = NEW.staffID
          AND appointmentRating IS NOT NULL
    )
    WHERE staffID = NEW.staffID;
END;;

CREATE TRIGGER trg_update_staff_rating_delete
AFTER DELETE ON Appointment
FOR EACH ROW
BEGIN
    UPDATE Staff
    SET staffRating = (
        SELECT AVG(appointmentRating)
        FROM Appointment
        WHERE staffID = OLD.staffID
          AND appointmentRating IS NOT NULL
    )
    WHERE staffID = OLD.staffID;
END;;

DELIMITER ;

DROP TRIGGER IF EXISTS create_invoice_payment_after_completion;
DELIMITER %%
-- Trigger creates invoices and payment record when appointment status is changed to complete
-- payment status is set to pending, method is set to online (can be changed by admin later),
-- and date payment was made is set to NULL (until admin changes it once payment is made)
CREATE TRIGGER create_invoice_payment_after_completion
AFTER UPDATE ON Appointment
FOR EACH ROW
BEGIN
    DECLARE custID VARCHAR(10);
    DECLARE svcType VARCHAR(50);
    DECLARE svcDesc VARCHAR(100);
    DECLARE rate DECIMAL(10,2);
    DECLARE amt DECIMAL(10,2);
    DECLARE invID VARCHAR(10);
    IF NEW.appointmentStatus = 'complete' AND OLD.appointmentStatus <> 'complete' THEN
        SELECT customerID INTO custID
        FROM Pet
        WHERE petID = NEW.petID;
        
        SELECT serviceType INTO svcType
        FROM Service
        WHERE serviceID = NEW.serviceID;
        
        SELECT serviceName INTO svcDesc
        FROM Service
        WHERE serviceID = NEW.serviceID;
        
        IF svcType = 'dog-walking' THEN
            SET rate = 30;
        ELSEIF svcType = 'pet-sitting' THEN
            SET rate = 45;
        ELSEIF svcType = 'training' THEN
            SET rate = 60;
        END IF;
        SET amt = NEW.duration * rate;
		SET invID = CONCAT('AUTO-', NEW.apptID);
        
        INSERT INTO Invoice (invoiceID, customerID, adminID, status, billingAddress, amount, dateCreated, dueDate, serviceDescription)
        VALUES (
            invID,
            custID,
            'AD01',
            'unpaid',
            '123 Elm St, Chicago',
            amt,
            CURDATE(),
            DATE_ADD(CURDATE(), INTERVAL 10 DAY),
            svcDesc
        );
        INSERT INTO Payment (paymentID, invoiceID,adminID, amount, date, method, status)
		VALUES (
			CONCAT('PM-', NEW.apptID),
			invID,
			'AD01',
			amt,
			null,
			'online',
			'pending'
		);

    END IF;
END %%
DELIMITER ;


DROP TRIGGER IF EXISTS trg_prevent_overlaps;
DELIMITER $$
-- prevents overlapping appointments for staff members and pets from being booked
CREATE TRIGGER trg_prevent_overlaps
BEFORE INSERT ON Appointment
FOR EACH ROW
BEGIN
    DECLARE staff_conflicts INT;
    DECLARE pet_conflicts INT;
    SELECT COUNT(*)
    INTO staff_conflicts
    FROM Appointment
    WHERE staffID = NEW.staffID
      AND date = NEW.date
      AND appointmentStatus IN ('scheduled', 'in progress')
      AND (
            NEW.startTime < ADDTIME(startTime, SEC_TO_TIME(duration * 3600))
            AND ADDTIME(NEW.startTime, SEC_TO_TIME(NEW.duration * 3600)) > startTime
      );
    SELECT COUNT(*)
    INTO pet_conflicts
    FROM Appointment
    WHERE petID = NEW.petID
      AND date = NEW.date
      AND appointmentStatus IN ('scheduled', 'in progress')
      AND (
            NEW.startTime < ADDTIME(startTime, SEC_TO_TIME(duration * 3600))
            AND ADDTIME(NEW.startTime, SEC_TO_TIME(NEW.duration * 3600)) > startTime
      );

    IF staff_conflicts > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Staff member already has an overlapping appointment';
    END IF;
    IF pet_conflicts > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Pet already has an overlapping appointment';
    END IF;

END $$
DELIMITER ;


-- INSERTS

-- Customer
INSERT INTO Customer VALUES
('C0001', 'Barry', '515-601-8837', 'barry@gmail.com', '123 Elm St, Chicago'),
('C0002', 'Linda Martinez', '312-555-0198', 'linda.m@gmail.com', '456 Oak Ave, Chicago'),
('C0003', 'James Cooper', '773-555-8821', 'jcooper@gmail.com', '789 Maple Dr, Evanston'),
('C0004', 'Sophia Nguyen', '847-555-4432', 'sophia.n@gmail.com', '321 Pine Rd, Naperville'),
('C0005', 'Michael Thompson', '630-555-7719', 'mthompson@gmail.com', '654 Cedar Ln, Aurora');


-- Pet
INSERT INTO Pet VALUES
('P0001', 'C0001', 'Amber', 2, 'Dog', 'Husky', 'large', 'Sensitive to loud noises'),
('P0002', 'C0002', 'Whiskers', 4, 'Cat', 'Siamese', 'small', 'Very shy, hides from new people'),
('P0003', 'C0002', 'Max', 7, 'Dog', 'Labrador', 'large', 'Calm demeanor, senior dog'),
('P0004', 'C0003', 'Buddy', 3, 'Dog', 'Border Collie', 'medium', 'Highly energetic, needs structured activity'),
('P0005', 'C0004', 'Luna', 1, 'Dog', 'Chihuahua', 'small', 'Anxious when separated from owner');


-- Staff
INSERT INTO Staff VALUES
('S0001', 'Alex', 'Walker', '515-601-1111', 'alex@petco.com', 'Mon-Fri 8am-4pm', 4.80),
('S0002', 'Jamie', 'Sitter', '515-601-2222', 'jamie@petco.com', 'Tue-Sat 10am-6pm', 4.60),
('S0003', 'Taylor', 'Trainer', '515-601-3333', 'taylor@petco.com', 'Mon-Thu 9am-5pm', 4.90),
('S0004', 'Morgan', 'Walker', '515-601-4444', 'morgan@petco.com', 'Wed-Sun 7am-3pm', 4.50),
('S0005', 'Casey', 'Sitter', '515-601-5555', 'casey@petco.com', 'Fri-Mon 12pm-8pm', 4.70);

-- Service
INSERT INTO Service VALUES
('J01', 'Dog Walking', 'dog-walking', 0.50, 'Standard leash walk around the neighborhood'),
('J02', 'Extended Dog Walking', 'dog-walking', 1.00, 'Longer walk with park time and play'),
('J03', 'Pet Sitting', 'pet-sitting', 2.00, 'In-home companion care and feeding'),
('J04', 'Overnight Pet Sitting', 'pet-sitting', 12.00, 'Overnight stay at customer home'),
('J05', 'Obedience Training', 'training', 1.00, 'Basic obedience and behavioral training session');

-- Performs
INSERT INTO Performs VALUES
('S0001', 'J01'),
('S0001', 'J02'),
('S0002', 'J03'),
('S0003', 'J05'),
('S0004', 'J01');

-- Appointment
INSERT INTO Appointment VALUES
('A0001', 'P0001', 'S0001', 'scheduled',   'J01', '2025-03-20', '11:00:00', 2.00, 'First visit', 5),
('A0002', 'P0003', 'S0004', 'complete',    'J01', '2025-03-18', '09:00:00', 0.75, 'Easy-paced walk due to age', 4),
('A0003', 'P0004', 'S0003', 'complete',    'J05', '2025-03-19', '14:00:00', 1.00, 'Focused on leash manners and recall', 5),
('A0004', 'P0002', 'S0002', 'in progress', 'J03', '2025-03-20', '10:00:00', 2.00, 'Owner traveling, extra calming care needed', 4),
('A0005', 'P0005', 'S0001', 'scheduled',   'J02', '2025-03-21', '16:00:00', 1.00, 'Short walk with frequent reassurance', 3);


-- Admin
INSERT INTO Admin VALUES
('AD01', 'Emma Brown', 'emma@petservices.com', '312-111-1111'),
('AD02', 'Liam Smith', 'liam@petservices.com', '312-222-2222'),
('AD03', 'Olivia Davis', 'olivia@petservices.com', '312-333-3333'),
('AD04', 'Noah Wilson', 'noah@petservices.com', '312-444-4444'),
('AD05', 'Ava Johnson', 'ava@petservices.com', '312-555-5555');

-- Invoice
INSERT INTO Invoice VALUES
('I0001', 'C0001', 'AD01', 'unpaid', '123 Elm St, Chicago', 75.00, '2025-03-20', '2025-03-30', 'Dog Walking Service'),
('I0002', 'C0002', 'AD02', 'paid', '123 Elm St, Chicago', 150.00, '2025-03-21', '2025-03-31', 'Pet Sitting Service'),
('I0003', 'C0003', 'AD03', 'unpaid', '123 Elm St, Chicago', 100.00, '2025-03-22', '2025-04-01', 'Training Session'),
('I0004', 'C0004', 'AD04', 'paid', '123 Elm St, Chicago', 200.00, '2025-03-23', '2025-04-02', 'Overnight Sitting'),
('I0005', 'C0005', 'AD05', 'unpaid', '123 Elm St, Chicago', 60.00, '2025-03-24', '2025-04-03', 'Short Walk');

-- Payment
INSERT INTO Payment VALUES
('PM01', 'I0002', 'AD02', 150.00, '2025-03-25', 'credit card', 'completed'),
('PM02', 'I0004', 'AD04', 200.00, '2025-03-26', 'debit', 'completed'),
('PM03', 'I0001', 'AD01', 75.00, '2025-03-27', 'cash', 'pending'),
('PM04', 'I0003', 'AD03', 100.00, '2025-03-28', 'online', 'failed'),
('PM05', 'I0005', 'AD05', 60.00, '2025-03-29', 'credit card', 'pending');


-- TEST TRIGGERS (run after inserts)

-- test create_invoice_payment_after_completion
SELECT * FROM Appointment;
UPDATE Appointment
SET appointmentStatus = 'scheduled'
WHERE apptID = 'A0001';
SELECT * FROM Invoice;
SELECT * FROM Payment;
DELETE FROM Payment
WHERE paymentID = 'PM-A0001';
DELETE FROM Invoice
WHERE invoiceID = 'AUTO-A0001';


-- test trg_prevent_overlaps
/* This test fails and SQL stops executing here, for demo purposes this is commented out
SELECT * FROM Appointment;
INSERT INTO Appointment
VALUES (
'A0006', 'P0002', 'S0001', 'scheduled', 'J01', '2025-03-20', '11:30:00', 1.00, 'Overlap test', 1);
DELETE FROM Appointment
WHERE apptID = 'A0006';
*/

-- PROCEDURES
DELIMITER ;;
-- Track which pets use which services most 
CREATE PROCEDURE GetPetServiceUsage()
BEGIN
    SELECT 
        p.petID,
        p.petName,
        s.serviceName,
        COUNT(a.apptID) AS times_used
    FROM Appointment a
    JOIN Pet p ON p.petID = a.petID
    JOIN Service s ON s.serviceID = a.serviceID
    GROUP BY p.petID, p.petName, s.serviceName
    ORDER BY p.petID, times_used DESC;
END;;

DELIMITER ;
CALL GetPetServiceUsage();



DROP PROCEDURE IF EXISTS GetPeakHours;
DELIMITER $$
CREATE PROCEDURE GetPeakHours()
BEGIN
    SELECT 
        HOUR(startTime) AS peak_hours,
        COUNT(*) AS total_appointments
    FROM Appointment
    GROUP BY HOUR(startTime)
    ORDER BY total_appointments DESC;
END $$

DELIMITER ;
CALL GetPeakHours();


-- FUNCTION
DELIMITER %%
-- Get the total number of services provided in any given month and year
CREATE FUNCTION GetMonthlyServiceCount(inputMonth INT, inputYear INT)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE total INT;
    SELECT COUNT(*)
    INTO total
    FROM Appointment
    WHERE MONTH(date) = inputMonth
      AND YEAR(date) = inputYear;
	RETURN total;
END %%

DELIMITER ;
SELECT GetMonthlyServiceCount(3, 2025);


-- QUERIES/VIEWS

--  Find customers with the most amount of pets to identify high-value or repeat customers
SELECT c.customerName, COUNT(p.petID) AS num_pets 
FROM Pet p JOIN Customer c ON c.customerID = p.customerID 
GROUP BY p.customerID 
ORDER BY COUNT(p.petID) DESC;
-- Q2 Staff overview
SELECT p.staffID, st.staffName, p.serviceID, se.serviceName 
FROM Performs p 
JOIN Staff st ON p.staffID = st.staffID 
JOIN Service se ON se.serviceID=p.serviceID;
-- Q3 Invoice overview
SELECT I.invoiceID, I.customerID, C.customerName, I.amount, P.method, 
I.adminID, A.name, I.dueDate, I.status AS invoice_status, P.status AS payment_status 
FROM Invoice I 
JOIN Customer C ON C.customerID=I.customerID 
LEFT JOIN Payment P ON P.invoiceID=I.invoiceID 
JOIN Admin A on A.adminID=I.adminID;
-- Q4 Analyze staff appointment ratings by staff member compared to overall average ratings to evaluate performance
SELECT staffID, staffName, staffRating 
FROM Staff 
WHERE staffRating > (SELECT AVG(staffRating) FROM Staff) 
ORDER BY staffRating DESC;
-- Q5 Appointment status
SELECT A.apptID, P.petName, Se.serviceName, St.staffName, A.date, A.startTime, Se.standardDuration AS appt_len, 
A.appointmentStatus AS appt_status 
FROM Appointment A 
JOIN Service Se ON Se.serviceID=A.serviceID 
JOIN Pet P ON P.petID=A.petID 
JOIN Staff St ON St.staffID=A.staffID;
-- V1 Service usage overview
CREATE VIEW ServiceUsage AS
SELECT se.serviceID, se.serviceName, COUNT(a.apptID) AS totalAppointments FROM Service se LEFT JOIN Appointment a ON a.serviceID = se.serviceID GROUP BY se.serviceID, se.serviceName;
SELECT * FROM ServiceUsage;
-- V2 Customer & pet overview
CREATE VIEW CustomerPet AS
SELECT c.customerID, c.customerName, p.petID, p.petName, p.age, p.type, p.breed, p.size FROM Customer c LEFT JOIN Pet P ON p.customerID=c.customerID;
SELECT * FROM CustomerPet;