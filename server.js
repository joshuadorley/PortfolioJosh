require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors({ origin: "*" }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
});
const User = mongoose.model("User", userSchema);

// Contact Schema
const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    subject: String,
    message: String,
});
const Contact = mongoose.model("Contact", contactSchema);

// Register Route
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error registering user" });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1h" });
        res.json({ message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ error: "Login error" });
    }
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(403).json({ error: "Access denied" });
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ error: "Invalid token" });
    }
};

// Create Contact Entry
app.post('/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "All fields are required" });
    }
    try {
        const newContact = new Contact({ name, email, subject, message });
        await newContact.save();
        res.status(201).json({ message: "Contact saved successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error saving contact" });
    }
});

// Get All Contacts (Protected Route)
app.get('/contacts', verifyToken, async (req, res) => {
    try {
        const contacts = await Contact.find();
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: "Error fetching contacts" });
    }
});

// Nodemailer Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Send Contact Email
app.post('/send-email', async (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "All fields are required" });
    }
    const mailOptions = {
        from: email,
        to: process.env.EMAIL_USER,
        subject: `New Contact Form Submission: ${subject}`,
        text: `From: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Email Error:", error);
            return res.status(500).json({ error: "Error sending email" });
        }
        return res.status(200).json({ message: "Email sent successfully!" });
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
