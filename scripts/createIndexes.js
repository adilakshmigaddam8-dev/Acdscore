/**
 * Ensure all MongoDB indexes are created
 * Usage: node scripts/createIndexes.js
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

// Import models so Mongoose registers their schemas
require('../models/User');
require('../models/AcademicRecord');
require('../models/Calculation');
require('../models/Analytics');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Sync indexes for all models
    const models = Object.values(mongoose.models);
    for (const model of models) {
      await model.syncIndexes();
      console.log(`✅ Indexes synced for: ${model.modelName}`);
    }

    console.log('\nAll indexes created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Index creation error:', err.message);
    process.exit(1);
  }
};

run();
