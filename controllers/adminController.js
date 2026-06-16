const User = require('../models/User');
const Calculation = require('../models/Calculation');
const Analytics = require('../models/Analytics');

// POST /api/admin/login – handled by auth routes with role check

// GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      totalCalculations,
      dailyVisitors,
      calcTypeCounts,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Calculation.countDocuments(),
      Analytics.countDocuments({ createdAt: { $gte: todayStart } }),
      Calculation.aggregate([
        { $group: { _id: '$calculatorType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(5).select('name email createdAt loginCount'),
    ]);

    const popularCalculators = calcTypeCounts.map((c) => ({
      type: c._id,
      count: c.count,
    }));

    res.json({
      success: true,
      dashboard: {
        totalUsers,
        totalCalculations,
        dailyVisitors,
        popularCalculators,
        recentUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = { role: 'user' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .select('name email createdAt loginCount lastLogin role');

    res.json({ success: true, total, page: Number(page), users });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete admin accounts.' });
    }
    await user.deleteOne();
    res.json({ success: true, message: 'User deleted.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/calculations
const getCalculations = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, type } = req.query;
    const filter = type ? { calculatorType: type } : {};
    const total = await Calculation.countDocuments(filter);
    const records = await Calculation.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('userId', 'name email');
    res.json({ success: true, total, records });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getUsers, deleteUser, getCalculations };
