const Analytics = require('../models/Analytics');

// POST /api/analytics/track
const track = async (req, res, next) => {
  try {
    const { page, action, device, referralSource, sessionId } = req.body;

    // Detect device from User-Agent if not provided
    const ua = req.headers['user-agent'] || '';
    const detectedDevice = device || (
      /mobile/i.test(ua) ? 'mobile' :
      /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop'
    );

    await Analytics.create({
      userId: req.user?._id || null,
      page,
      action: action || 'pageview',
      device: detectedDevice,
      referralSource: referralSource || req.headers.referer || 'direct',
      ipAddress: req.ip,
      userAgent: ua,
      sessionId,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/overview
const overview = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const [
      totalVisits,
      deviceBreakdown,
      topPages,
      dailyVisits,
    ] = await Promise.all([
      Analytics.countDocuments({ createdAt: { $gte: since } }),
      Analytics.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$device', count: { $sum: 1 } } },
      ]),
      Analytics.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$page', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Analytics.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      overview: { totalVisits, deviceBreakdown, topPages, dailyVisits },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { track, overview };
