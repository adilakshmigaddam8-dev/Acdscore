/**
 * Seed Script – Creates the first admin user
 * Usage: node scripts/seedAdmin.js
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      console.log('Admin already exists:', existing.email);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'AcadScore Admin',
      email: 'admin@acadscore.com',
      password: 'Admin@12345',   // ← CHANGE THIS after first login
      role: 'admin',
    });

    console.log('✅ Admin created successfully!');
    console.log('   Email:', admin.email);
    console.log('   Password: Admin@12345  ← CHANGE IMMEDIATELY');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
};

seed();
